const HostessProfileService = require('../../services/HostessProfileService');
const VehicleProfileService = require('../../services/VehicleProfileService');
const DocumentService = require('../../services/DocumentService');
const {
  HOSTESS_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  PERPETUAL_DOCUMENT_TYPES,
} = require('../../utils/constants');

async function showList(req, res) {
  const hostesses = await HostessProfileService.listForUser(req.session.userId);
  res.render('hostess/list', {
    title: 'Hosteslerim',
    hostesses,
  });
}

async function showCreateForm(req, res) {
  // Kullanıcının hangi araca hostes ekleyebileceğini seçmesi için dropdown.
  // Boştaki hostesler ayrıca listelenir ki kullanıcı yeni oluşturmak yerine
  // "mevcut boşta hostesi bu araca ata" seçeneğini görebilsin.
  const vehicles = await VehicleProfileService.listForUser(req.session.userId);
  const unassignedHostesses = await HostessProfileService.listUnassignedForUser(req.session.userId);
  res.render('hostess/create', {
    title: 'Yeni Hostes',
    vehicles,
    unassignedHostesses,
    error: null,
    formData: {},
  });
}

async function create(req, res) {
  try {
    const result = await HostessProfileService.create(req.body, req.session.userId);
    res.redirect(`/hostess/${result.id}`);
  } catch (err) {
    const vehicles = await VehicleProfileService.listForUser(req.session.userId);
    const unassignedHostesses = await HostessProfileService.listUnassignedForUser(req.session.userId);
    res.status(400).render('hostess/create', {
      title: 'Yeni Hostes',
      vehicles,
      unassignedHostesses,
      error: err.message,
      formData: req.body,
    });
  }
}

// Boştaki hostesi bir araca atar (yeni hostes oluşturmadan).
async function assignExisting(req, res) {
  try {
    const hostessId = parseInt(req.body.hostess_id, 10);
    const vehicleId = parseInt(req.body.vehicle_id, 10);
    if (!hostessId || !vehicleId) throw new Error('Hostes ve araç seçimi zorunlu');
    await HostessProfileService.assignToVehicle(req.session.userId, hostessId, vehicleId);
    res.redirect(`/hostess/${hostessId}`);
  } catch (err) {
    res.status(400).send(`Atama hatası: ${err.message}. <a href="/hostess/create">Geri</a>`);
  }
}

async function setActive(req, res) {
  const hostessId = parseInt(req.params.id, 10);
  const active = req.path.endsWith('/activate');
  try {
    await HostessProfileService.setActive(req.session.userId, hostessId, active);
    res.redirect(`/hostess/${hostessId}`);
  } catch (err) {
    res.status(400).send(`Hata: ${err.message}. <a href="/hostess/${hostessId}">Geri</a>`);
  }
}

async function deleteHostess(req, res) {
  const hostessId = parseInt(req.params.id, 10);
  try {
    await HostessProfileService.softDelete(req.session.userId, hostessId);
    res.redirect('/hostess');
  } catch (err) {
    res.status(400).send(`Silme hatası: ${err.message}. <a href="/hostess/${hostessId}">Geri</a>`);
  }
}

async function showDetail(req, res) {
  try {
    const hostessId = parseInt(req.params.id, 10);
    const hostess = await HostessProfileService.getForUser(req.session.userId, hostessId);
    const documents = await DocumentService.listForHostess(hostessId);

    const documentsByType = {};
    for (const doc of documents) {
      if (!documentsByType[doc.document_type]) {
        documentsByType[doc.document_type] = doc;
      }
    }

    res.render('hostess/detail', {
      title: `Hostes — ${hostess.first_name} ${hostess.last_name}`,
      hostess,
      documents,
      documentsByType,
      requiredTypes: HOSTESS_DOCUMENT_TYPES,
      typeLabels: DOCUMENT_TYPE_LABELS,
      perpetualTypes: PERPETUAL_DOCUMENT_TYPES,
    });
  } catch (err) {
    res.status(403).send(`Erişim hatası: ${err.message}. <a href="/hostess">Hosteslerim</a>`);
  }
}

async function updateSafeFields(req, res) {
  const hostessId = parseInt(req.params.id, 10);
  try {
    await HostessProfileService.updateSafeFields(req.session.userId, hostessId, {
      phone: req.body.phone,
      notes: req.body.notes,
    });
    res.redirect(`/hostess/${hostessId}`);
  } catch (err) {
    res.status(400).send(`Güncelleme hatası: ${err.message}. <a href="/hostess/${hostessId}">Geri</a>`);
  }
}

async function uploadDocument(req, res) {
  const hostessId = parseInt(req.params.id, 10);
  try {
    await DocumentService.uploadHostessDocument(
      { file: req.file, document_type: req.body.document_type, expires_at: req.body.expires_at, hostessId },
      req.session.userId
    );
    res.redirect(`/hostess/${hostessId}`);
  } catch (err) {
    res.status(400).send(`Yükleme hatası: ${err.message}. <a href="/hostess/${hostessId}">Geri</a>`);
  }
}

module.exports = { showList, showCreateForm, create, assignExisting, showDetail, updateSafeFields, uploadDocument, deleteHostess, setActive };
