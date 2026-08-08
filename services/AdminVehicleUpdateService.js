const VehicleProfileUpdateRequestModel = require('../models/VehicleProfileUpdateRequestModel');
const VehicleProfileModel = require('../models/VehicleProfileModel');

async function listPending() {
  return VehicleProfileUpdateRequestModel.findAllPendingDetailed();
}

async function approve(requestId, adminUserId, note) {
  const request = await VehicleProfileUpdateRequestModel.findById(requestId);
  if (!request) throw new Error('Talep bulunamadı');
  if (request.status !== 'pending') throw new Error('Bu talep zaten işlem gördü');

  // Plaka değişecekse tekillik kontrolü (başka araca çakışmasın)
  if (request.requested_plate_number) {
    const other = await VehicleProfileModel.findByPlateNumber(request.requested_plate_number);
    if (other && other.id !== request.vehicle_profile_id) {
      throw new Error('Talep edilen plaka başka bir araç tarafından kullanılıyor');
    }
  }

  const affected = await VehicleProfileUpdateRequestModel.approve(requestId, adminUserId, note);
  if (!affected) throw new Error('Talep güncellenemedi (belki eş zamanlı işlem)');

  await VehicleProfileModel.applySensitiveFields(request.vehicle_profile_id, {
    plate_number:  request.requested_plate_number,
    brand:         request.requested_brand,
    model:         request.requested_model,
    year:          request.requested_year,
    vehicle_type:  request.requested_vehicle_type,
    capacity:      request.requested_capacity,
  });
}

async function reject(requestId, adminUserId, reason) {
  if (!reason || !reason.trim()) throw new Error('Reddetme gerekçesi zorunludur');
  const request = await VehicleProfileUpdateRequestModel.findById(requestId);
  if (!request) throw new Error('Talep bulunamadı');
  if (request.status !== 'pending') throw new Error('Bu talep zaten işlem gördü');
  const affected = await VehicleProfileUpdateRequestModel.reject(requestId, adminUserId, reason.trim());
  if (!affected) throw new Error('Talep güncellenemedi (belki eş zamanlı işlem)');
}

module.exports = { listPending, approve, reject };
