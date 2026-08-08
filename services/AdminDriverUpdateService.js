const DriverProfileUpdateRequestModel = require('../models/DriverProfileUpdateRequestModel');
const DriverProfileModel = require('../models/DriverProfileModel');

async function listPending() {
  return DriverProfileUpdateRequestModel.findAllPendingDetailed();
}

async function approve(requestId, adminUserId, note) {
  const request = await DriverProfileUpdateRequestModel.findById(requestId);
  if (!request) throw new Error('Talep bulunamadı');
  if (request.status !== 'pending') throw new Error('Bu talep zaten işlem gördü');

  // Önce onay durumunu güncelle (yarış koruması: WHERE status='pending')
  const affected = await DriverProfileUpdateRequestModel.approve(requestId, adminUserId, note);
  if (!affected) throw new Error('Talep güncellenemedi (belki eş zamanlı işlem)');

  // Sonra profili gerçekten uygula
  await DriverProfileModel.applySensitiveFields(request.driver_profile_id, {
    national_id: request.requested_national_id,
    birth_date: request.requested_birth_date,
    license_class: request.requested_license_class,
  });
}

async function reject(requestId, adminUserId, reason) {
  if (!reason || !reason.trim()) throw new Error('Reddetme gerekçesi zorunludur');

  const request = await DriverProfileUpdateRequestModel.findById(requestId);
  if (!request) throw new Error('Talep bulunamadı');
  if (request.status !== 'pending') throw new Error('Bu talep zaten işlem gördü');

  const affected = await DriverProfileUpdateRequestModel.reject(requestId, adminUserId, reason.trim());
  if (!affected) throw new Error('Talep güncellenemedi (belki eş zamanlı işlem)');
}

module.exports = { listPending, approve, reject };
