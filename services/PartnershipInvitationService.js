const PartnershipInvitationModel = require('../models/PartnershipInvitationModel');
const CompanyModel = require('../models/CompanyModel');
const { generateCode } = require('../utils/otp');
const { PARTNERSHIP_INVITATION_EXPIRY_MINUTES } = require('../utils/constants');

const MAX_CODE_ATTEMPTS = 5;

// Bir kurumun türünün karşıtı — provider ↔ receiver
function oppositeType(companyType) {
  if (companyType === 'provider') return 'receiver';
  if (companyType === 'receiver') return 'provider';
  return null;
}

// Kurum admin'i partnership daveti üretir.
async function create({ label }, { companyId, userId }) {
  if (!companyId) {
    throw new Error('Aktif bir çalışma alanı seçili değil');
  }

  // Davet eden kurumun kendisini çek — türünü ve aktifliğini doğrula
  const initiator = await CompanyModel.findById(companyId);
  if (!initiator) throw new Error('Kurum bulunamadı');
  if (!initiator.is_active) {
    throw new Error('Kurumun SuperAdmin tarafından onaylanmadan iş ortaklığı başlatamazsın');
  }

  const targetType = oppositeType(initiator.company_type);
  if (!targetType) {
    throw new Error('Kurumun türü iş ortaklığına uygun değil');
  }

  const cleanLabel = label && label.trim() ? label.trim().slice(0, 200) : null;

  // Benzersiz kod üret (çakışırsa yeniden dene)
  let code = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateCode();
    const exists = await PartnershipInvitationModel.existsByCode(candidate);
    if (!exists) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    throw new Error('Kod üretilemedi, lütfen tekrar deneyin');
  }

  const expiresAt = new Date(Date.now() + PARTNERSHIP_INVITATION_EXPIRY_MINUTES * 60 * 1000);

  const id = await PartnershipInvitationModel.create({
    initiator_company_id: companyId,
    target_company_type: targetType,
    code,
    label: cleanLabel,
    expires_at: expiresAt,
    created_by: userId,
  });

  return {
    id,
    code,
    target_company_type: targetType,
    label: cleanLabel,
    expires_at: expiresAt,
    expiry_minutes: PARTNERSHIP_INVITATION_EXPIRY_MINUTES,
  };
}

async function listPendingForCompany(companyId) {
  if (!companyId) return [];
  return PartnershipInvitationModel.findPendingByCompany(companyId);
}

async function cancel(invitationId, { companyId }) {
  const affected = await PartnershipInvitationModel.cancel(invitationId, companyId);
  if (!affected) {
    throw new Error('Davet bulunamadı veya iptal edilemez durumda');
  }
}

module.exports = { create, listPendingForCompany, cancel, oppositeType };
