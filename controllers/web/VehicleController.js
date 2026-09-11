const VehicleProfileService = require('../../services/VehicleProfileService');
const DocumentService = require('../../services/DocumentService');
const { VEHICLE_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, PERPETUAL_DOCUMENT_TYPES } = require('../../utils/constants');

async function showList(req, res) {
    const all = await VehicleProfileService.listForUser(req.session.userId);
    res.render('vehicles/list', {
        title: 'Araçlarım',
        vehicles: all,
        stats: {
            active:   all.filter(v => v.status === 'active').length,
            pending:  all.filter(v => v.status === 'pending_docs').length,
            inactive: all.filter(v => v.status === 'inactive').length,
        },
    });
}

function showCreateForm(req, res) {
    res.render('vehicles/create', {
        title: 'Yeni Araç',
        error: null,
        formData: {},
    });
}

async function create(req, res) {
    try {
        const vehicle = await VehicleProfileService.create(req.body, req.session.userId);
        res.redirect(`/vehicles/${vehicle.id}`);
    } catch (err) {
        res.status(400).render('vehicles/create', {
            title: 'Yeni Araç',
            error: err.message,
            formData: req.body,
        });
    }
}

async function showDetail(req, res) {
    try {
        const vehicleId = parseInt(req.params.id, 10);
        const vehicle = await VehicleProfileService.getForUser(req.session.userId, vehicleId);
        const documents = await DocumentService.listForVehicle(vehicleId);

        const documentsByType = {};
        for (const doc of documents) {
            if (!documentsByType[doc.document_type]) {
                documentsByType[doc.document_type] = doc;
            }
        }

        const pendingRequest = await VehicleProfileService.getMyPendingRequest(req.session.userId, vehicleId);

        res.render('vehicles/detail', {
            title: `${vehicle.plate_number} — ${vehicle.brand} ${vehicle.model}`,
            vehicle,
            documents,
            documentsByType,
            requiredTypes: VEHICLE_DOCUMENT_TYPES,
            typeLabels: DOCUMENT_TYPE_LABELS,
            perpetualTypes: PERPETUAL_DOCUMENT_TYPES,
            pendingRequest,
        });
    } catch (err) {
        res.status(403).send(`Erişim hatası: ${err.message}. <a href="/vehicles">Araçlarım</a>`);
    }
}

async function showEditForm(req, res) {
    try {
        const vehicleId = parseInt(req.params.id, 10);
        const vehicle = await VehicleProfileService.getForUser(req.session.userId, vehicleId);
        const pendingRequest = await VehicleProfileService.getMyPendingRequest(req.session.userId, vehicleId);
        res.render('vehicles/edit', {
            title: `Aracı Düzenle — ${vehicle.plate_number}`,
            vehicle,
            pendingRequest,
            error: null,
            formData: vehicle,
        });
    } catch (err) {
        res.status(403).send(`Erişim hatası: ${err.message}. <a href="/vehicles">Araçlarım</a>`);
    }
}

async function updateVehicle(req, res) {
    const vehicleId = parseInt(req.params.id, 10);
    try {
        await VehicleProfileService.updateSafeFields(req.session.userId, vehicleId, {
            notes: req.body.notes,
        });

        const hasSensitiveChange =
          req.body.plate_number || req.body.brand || req.body.model ||
          req.body.year || req.body.vehicle_type || req.body.capacity;
        if (hasSensitiveChange) {
            await VehicleProfileService.requestSensitiveUpdate(req.session.userId, vehicleId, {
                plate_number:  req.body.plate_number,
                brand:         req.body.brand,
                model:         req.body.model,
                year:          req.body.year,
                vehicle_type:  req.body.vehicle_type,
                capacity:      req.body.capacity,
            });
        }
        res.redirect(`/vehicles/${vehicleId}`);
    } catch (err) {
        try {
            const vehicle = await VehicleProfileService.getForUser(req.session.userId, vehicleId);
            const pendingRequest = await VehicleProfileService.getMyPendingRequest(req.session.userId, vehicleId);
            res.status(400).render('vehicles/edit', {
                title: `Aracı Düzenle — ${vehicle.plate_number}`,
                vehicle,
                pendingRequest,
                error: err.message,
                formData: { ...vehicle, ...req.body },
            });
        } catch (innerErr) {
            res.status(500).send(`Hata: ${err.message}`);
        }
    }
}

async function cancelUpdateRequest(req, res) {
    try {
        await VehicleProfileService.cancelMyPendingRequest(
            req.session.userId, parseInt(req.params.reqId, 10)
        );
        res.redirect(`/vehicles/${req.params.id}`);
    } catch (err) {
        res.status(400).send(`İptal hatası: ${err.message}. <a href="/vehicles/${req.params.id}">Geri</a>`);
    }
}

async function setActive(req, res) {
    const vehicleId = parseInt(req.params.id, 10);
    const active = req.path.endsWith('/activate');
    try {
        await VehicleProfileService.setActive(req.session.userId, vehicleId, active);
        res.redirect(`/vehicles/${vehicleId}`);
    } catch (err) {
        res.status(400).send(`Hata: ${err.message}. <a href="/vehicles/${vehicleId}">Geri</a>`);
    }
}

async function deleteVehicle(req, res) {
    const vehicleId = parseInt(req.params.id, 10);
    try {
        await VehicleProfileService.softDelete(req.session.userId, vehicleId);
        res.redirect('/vehicles');
    } catch (err) {
        res.status(400).send(`Silme hatası: ${err.message}. <a href="/vehicles/${vehicleId}">Geri</a>`);
    }
}

module.exports = { showList, showCreateForm, create, showDetail, showEditForm, updateVehicle, cancelUpdateRequest, deleteVehicle, setActive };
