const DriverProfileService = require('../../services/DriverProfileService');
const DocumentService = require('../../services/DocumentService');
const { DRIVER_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, PERPETUAL_DOCUMENT_TYPES } = require('../../utils/constants');

async function showMyProfile(req, res) {
    const profile = await DriverProfileService.getMyProfile(req.session.userId);
    const documents = profile
        ? await DocumentService.listForDriverByUser(req.session.userId)
        : [];

    const documentsByType = {};
    for (const doc of documents) {
        if (!documentsByType[doc.document_type]) {
            documentsByType[doc.document_type] = doc;
        }
    }

    const pendingRequest = profile
        ? await DriverProfileService.getMyPendingRequest(req.session.userId)
        : null;

    res.render('drivers/profile', {
        title: 'Şoför Profilim',
        profile,
        documents,
        documentsByType,
        requiredTypes: DRIVER_DOCUMENT_TYPES,
        typeLabels: DOCUMENT_TYPE_LABELS,
        perpetualTypes: PERPETUAL_DOCUMENT_TYPES,
        pendingRequest,
    });
}

function showCreateForm(req, res) {
    res.render('drivers/create', {
        title: 'Şoför Profili Oluştur',
        error: null,
        formData: {},
    });
}

async function create(req, res) {
    try {
        await DriverProfileService.create(req.body, req.session.userId);
        res.redirect('/driver/profile');
    } catch (err) {
        res.status(400).render('drivers/create', {
            title: 'Şoför Profili Oluştur',
            error: err.message,
            formData: req.body,
        });
    }
}

async function showEditForm(req, res) {
    const profile = await DriverProfileService.getMyProfile(req.session.userId);
    if (!profile) return res.redirect('/driver/profile/create');
    const pendingRequest = await DriverProfileService.getMyPendingRequest(req.session.userId);
    res.render('drivers/edit', {
        title: 'Profili Düzenle',
        profile,
        pendingRequest,
        error: null,
        formData: profile,
    });
}

async function updateProfile(req, res) {
    try {
        // Sıradan alanlar (her seferinde direkt kaydedilir)
        await DriverProfileService.updateSafeFields(req.session.userId, {
            phone: req.body.phone,
            notes: req.body.notes,
        });

        // Hassas alanlar — sadece bir tanesi bile değişmişse talep oluştur
        const hasSensitiveChange =
          req.body.national_id || req.body.birth_date || req.body.license_class;
        if (hasSensitiveChange) {
            await DriverProfileService.requestSensitiveUpdate(req.session.userId, {
                national_id:   req.body.national_id,
                birth_date:    req.body.birth_date,
                license_class: req.body.license_class,
            });
        }

        res.redirect('/driver/profile');
    } catch (err) {
        const profile = await DriverProfileService.getMyProfile(req.session.userId);
        const pendingRequest = await DriverProfileService.getMyPendingRequest(req.session.userId);
        res.status(400).render('drivers/edit', {
            title: 'Profili Düzenle',
            profile,
            pendingRequest,
            error: err.message,
            formData: { ...profile, ...req.body },
        });
    }
}

async function cancelUpdateRequest(req, res) {
    try {
        await DriverProfileService.cancelMyPendingRequest(
            req.session.userId,
            parseInt(req.params.id, 10)
        );
        res.redirect('/driver/profile');
    } catch (err) {
        res.status(400).send(`İptal hatası: ${err.message}. <a href="/driver/profile">Geri dön</a>`);
    }
}

async function setActive(req, res) {
    const active = req.path.endsWith('/activate');
    try {
        await DriverProfileService.setActive(req.session.userId, active);
        res.redirect('/driver/profile');
    } catch (err) {
        res.status(400).send(`Hata: ${err.message}. <a href="/driver/profile">Geri</a>`);
    }
}

async function deleteProfile(req, res) {
    try {
        await DriverProfileService.softDelete(req.session.userId);
        res.redirect('/dashboard');
    } catch (err) {
        res.status(400).send(`Silme hatası: ${err.message}. <a href="/driver/profile">Geri</a>`);
    }
}

module.exports = { showMyProfile, showCreateForm, create, showEditForm, updateProfile, cancelUpdateRequest, deleteProfile, setActive };
