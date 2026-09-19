const fs = require('fs');
const path = require('path');
const DocumentModel = require('../models/DocumentModel');
const DriverProfileModel = require('../models/DriverProfileModel');
const VehicleProfileModel = require('../models/VehicleProfileModel');
const HostessProfileModel = require('../models/HostessProfileModel');
const FleetConnectionModel = require('../models/FleetConnectionModel');
const { DOCUMENTS_DIR } = require('../config/upload');
const DriverProfileService = require('./DriverProfileService');
const VehicleProfileService = require('./VehicleProfileService');
const HostessProfileService = require('./HostessProfileService');
const AuditService = require('./AuditService');
const {
  DRIVER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  HOSTESS_DOCUMENT_TYPES,
  OWNER_TYPES,
  AUDIT_ACTIONS,
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

// Belgenin sahibi olan kullanıcının id'sini çözer (owner_type'a göre).
async function resolveOwnerUserId(doc) {
  if (doc.owner_type === OWNER_TYPES.DRIVER_PROFILE) {
    const p = await DriverProfileModel.findById(doc.owner_id);
    return p ? p.user_id : null;
  }
  if (doc.owner_type === OWNER_TYPES.VEHICLE_PROFILE) {
    const v = await VehicleProfileModel.findById(doc.owner_id);
    return v ? v.owner_user_id : null;
  }
  if (doc.owner_type === OWNER_TYPES.HOSTESS_PROFILE) {
    const h = await HostessProfileModel.findById(doc.owner_id);
    return h ? h.managed_by_user_id : null;
  }
  return null;
}

// Bu kişi bu belgeyi görebilir mi?
//  1. Sistem admini/moderatör → her belge
//  2. Belgenin sahibi → kendi belgesi
//  3. Aktif kurum yöneticisi → kurumun filosundaki üyenin belgesi
async function canViewDocument(doc, viewer) {
  if (viewer.isSuperadmin) return true;

  const ownerUserId = await resolveOwnerUserId(doc);
  if (ownerUserId && ownerUserId === viewer.userId) return true;

  if (viewer.companyId) {
    const conn = await FleetConnectionModel.findActiveByTarget(
      viewer.companyId, doc.owner_type, doc.owner_id
    );
    if (conn) return true;
  }
  return false;
}

/**
 * Yetkili görüntüleme için belgenin diskteki güvenli yolunu döndürür.
 * Yetkisizse veya dosya yoksa hata fırlatır.
 * path.basename ile çözülür → path traversal imkansız + sunucu taşınsa da çalışır.
 */
async function getFileForViewer(documentId, viewer) {
  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error('Belge bulunamadı');

  const allowed = await canViewDocument(doc, viewer);
  if (!allowed) throw new Error('Bu belgeyi görme yetkin yok');

  // DB'deki file_path'in sadece dosya adını al, DOCUMENTS_DIR ile birleştir.
  // Bu sayede başka makinede kaydedilmiş absolute path bile olsa güvenli çözülür.
  const filename = path.basename(doc.file_path);
  const absolutePath = path.join(DOCUMENTS_DIR, filename);

  if (!fs.existsSync(absolutePath)) {
    throw new Error('Dosya sunucuda bulunamadı');
  }

  return {
    absolutePath,
    mimeType: doc.mime_type || 'application/octet-stream',
    filename: doc.original_filename || filename,
  };
}

async function verifyDocument(documentId, verifierId, ipAddress) {
  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error('Belge bulunamadı');
  if (doc.verification_status !== 'pending') {
    throw new Error('Bu belge zaten işlem gördü');
  }

  const affected = await DocumentModel.verify(documentId, verifierId);
  if (!affected) throw new Error('Belge güncellenemedi (belki eş zamanlı işlem)');

  await triggerOwnerRecompute(doc);

  AuditService.log({
    actorUserId: verifierId,
    action: AUDIT_ACTIONS.DOCUMENT_VERIFY,
    entityType: 'document',
    entityId: documentId,
    metadata: { documentType: doc.document_type, ownerType: doc.owner_type, ownerId: doc.owner_id },
    ipAddress,
  });
}

async function rejectDocument(documentId, verifierId, reason, ipAddress) {
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

  AuditService.log({
    actorUserId: verifierId,
    action: AUDIT_ACTIONS.DOCUMENT_REJECT,
    entityType: 'document',
    entityId: documentId,
    metadata: { documentType: doc.document_type, ownerType: doc.owner_type, ownerId: doc.owner_id, reason: reason.trim() },
    ipAddress,
  });
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
  getFileForViewer,
};
