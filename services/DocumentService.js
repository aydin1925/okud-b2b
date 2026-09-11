const fs = require('fs');
const DocumentModel = require('../models/DocumentModel');
const DriverProfileModel = require('../models/DriverProfileModel');
const VehicleProfileModel = require('../models/VehicleProfileModel');
const HostessProfileModel = require('../models/HostessProfileModel');
const DriverProfileService = require('./DriverProfileService');
const VehicleProfileService = require('./VehicleProfileService');
const HostessProfileService = require('./HostessProfileService');
const {
  DRIVER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  HOSTESS_DOCUMENT_TYPES,
  OWNER_TYPES,
} = require('../utils/constants');

async function uploadDriverDocument({ file, document_type, expires_at }, userId) {
  if (!file) throw new Error('Dosya seçilmedi');

  if (!DRIVER_DOCUMENT_TYPES.includes(document_type)) {
    safeUnlink(file.path);
    throw new Error('Geçersiz belge türü');
  }

  const driverProfile = await DriverProfileModel.findByUserId(userId);
  if (!driverProfile) {
    safeUnlink(file.path);
    throw new Error('Önce şoför profilini oluşturmalısın');
  }

  validateExpiresAt(expires_at, file.path);

  const documentId = await DocumentModel.create({
    owner_type: OWNER_TYPES.DRIVER_PROFILE,
    owner_id: driverProfile.id,
    document_type,
    file_path: file.path,
    original_filename: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    expires_at: expires_at || null,
    uploaded_by: userId,
  });

  return { id: documentId };
}

async function uploadVehicleDocument({ file, document_type, expires_at, vehicleId }, userId) {
  if (!file) throw new Error('Dosya seçilmedi');

  if (!VEHICLE_DOCUMENT_TYPES.includes(document_type)) {
    safeUnlink(file.path);
    throw new Error('Geçersiz belge türü');
  }

  const vehicle = await VehicleProfileModel.findById(vehicleId);
  if (!vehicle) {
    safeUnlink(file.path);
    throw new Error('Araç bulunamadı');
  }
  if (vehicle.owner_user_id !== userId) {
    safeUnlink(file.path);
    throw new Error('Bu araca belge yükleme yetkin yok');
  }

  validateExpiresAt(expires_at, file.path);

  const documentId = await DocumentModel.create({
    owner_type: OWNER_TYPES.VEHICLE_PROFILE,
    owner_id: vehicle.id,
    document_type,
    file_path: file.path,
    original_filename: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    expires_at: expires_at || null,
    uploaded_by: userId,
  });

  return { id: documentId };
}

async function uploadHostessDocument({ file, document_type, expires_at, hostessId }, userId) {
  if (!file) throw new Error('Dosya seçilmedi');

  if (!HOSTESS_DOCUMENT_TYPES.includes(document_type)) {
    safeUnlink(file.path);
    throw new Error('Geçersiz belge türü');
  }

  const hostess = await HostessProfileModel.findById(hostessId);
  if (!hostess) {
    safeUnlink(file.path);
    throw new Error('Hostes bulunamadı');
  }
  if (hostess.managed_by_user_id !== userId) {
    safeUnlink(file.path);
    throw new Error('Bu hosteşe belge yükleme yetkin yok');
  }

  validateExpiresAt(expires_at, file.path);

  const documentId = await DocumentModel.create({
    owner_type: OWNER_TYPES.HOSTESS_PROFILE,
    owner_id: hostess.id,
    document_type,
    file_path: file.path,
    original_filename: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    expires_at: expires_at || null,
    uploaded_by: userId,
  });

  return { id: documentId };
}

async function listForHostess(hostessId) {
  return DocumentModel.findByOwner(OWNER_TYPES.HOSTESS_PROFILE, hostessId);
}

async function listForDriverByUser(userId) {
  const driverProfile = await DriverProfileModel.findByUserId(userId);
  if (!driverProfile) return [];
  return DocumentModel.findByOwner(OWNER_TYPES.DRIVER_PROFILE, driverProfile.id);
}

async function listForVehicle(vehicleId) {
  return DocumentModel.findByOwner(OWNER_TYPES.VEHICLE_PROFILE, vehicleId);
}

async function listPending() {
  return DocumentModel.findAllPending();
}

async function verifyDocument(documentId, verifierId) {
  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error('Belge bulunamadı');
  if (doc.verification_status !== 'pending') {
    throw new Error('Bu belge zaten işlem gördü');
  }

  const affected = await DocumentModel.verify(documentId, verifierId);
  if (!affected) throw new Error('Belge güncellenemedi (belki eş zamanlı işlem)');

  await triggerOwnerRecompute(doc);
}

async function rejectDocument(documentId, verifierId, reason) {
  if (!reason || !reason.trim()) {
    throw new Error('Reddetme gerekçesi zorunludur');
  }

  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error('Belge bulunamadı');
  if (doc.verification_status !== 'pending') {
    throw new Error('Bu belge zaten işlem gördü');
  }

  const affected = await DocumentModel.reject(documentId, verifierId, reason.trim());
  if (!affected) throw new Error('Belge güncellenemedi (belki eş zamanlı işlem)');

  await triggerOwnerRecompute(doc);
}

async function triggerOwnerRecompute(doc) {
  if (doc.owner_type === OWNER_TYPES.DRIVER_PROFILE) {
    await DriverProfileService.recomputeStatus(doc.owner_id);
  } else if (doc.owner_type === OWNER_TYPES.VEHICLE_PROFILE) {
    await VehicleProfileService.recomputeStatus(doc.owner_id);
  } else if (doc.owner_type === OWNER_TYPES.HOSTESS_PROFILE) {
    await HostessProfileService.recomputeStatus(doc.owner_id);
  }
}

function validateExpiresAt(expires_at, filePath) {
  if (!expires_at) return;
  const d = new Date(expires_at);
  if (isNaN(d.getTime())) {
    safeUnlink(filePath);
    throw new Error('Geçersiz son geçerlilik tarihi');
  }
  if (d < new Date()) {
    safeUnlink(filePath);
    throw new Error('Son geçerlilik tarihi bugünden önce olamaz');
  }
}

function safeUnlink(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) console.error('Dosya silinemedi:', filePath, err.message);
  });
}

module.exports = {
  uploadDriverDocument,
  uploadVehicleDocument,
  uploadHostessDocument,
  listForDriverByUser,
  listForVehicle,
  listForHostess,
  listPending,
  verifyDocument,
  rejectDocument,
};
