const ConnectionRequestModel = require('../models/ConnectionRequestModel');
const { generateCode } = require('../utils/otp');
const {
  TARGET_TYPES,
  DRIVER_AND_VEHICLE,
  OTP_EXPIRY_MINUTES,
} = require('../utils/constants');

const VALID_TARGET_TYPES = [
  TARGET_TYPES.DRIVER_PROFILE,
  TARGET_TYPES.VEHICLE_PROFILE,
  DRIVER_AND_VEHICLE,
];
const MAX_CODE_ATTEMPTS = 5;

// Kurum adına yeni OTP kodu üretir.
async function create({ target_type, label }, { companyId, userId }) {
  if (!companyId) {
    throw new Error('Aktif bir çalışma alanı seçili değil');
  }
  if (!VALID_TARGET_TYPES.includes(target_type)) {
    throw new Error('Geçersiz hedef türü');
  }

  const cleanLabel = label && label.trim() ? label.trim().slice(0, 100) : null;

  // Benzersiz kod üret (çakışırsa yeniden dene)
  let code = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateCode();
    const exists = await ConnectionRequestModel.existsByCode(candidate);
    if (!exists) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    throw new Error('Kod üretilemedi, lütfen tekrar deneyin');
  }

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const id = await ConnectionRequestModel.create({
    company_id: companyId,
    target_type,
    code,
    label: cleanLabel,
    expires_at: expiresAt,
    created_by: userId,
  });

  return {
    id,
    code,
    target_type,
    label: cleanLabel,
    expires_at: expiresAt,
    expiry_minutes: OTP_EXPIRY_MINUTES,
  };
}

async function listPendingForCompany(companyId) {
  if (!companyId) return [];
  return ConnectionRequestModel.findPendingByCompany(companyId);
}

async function cancel(requestId, { companyId }) {
  const affected = await ConnectionRequestModel.cancel(requestId, companyId);
  if (!affected) {
    throw new Error('Kod bulunamadı veya iptal edilemez durumda');
  }
}

module.exports = { create, listPendingForCompany, cancel };
