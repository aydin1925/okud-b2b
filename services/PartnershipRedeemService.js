const PartnershipInvitationModel = require('../models/PartnershipInvitationModel');
const CompanyPartnershipModel = require('../models/CompanyPartnershipModel');
const CompanyModel = require('../models/CompanyModel');
const ContractTemplateService = require('./ContractTemplateService');
const { CONTRACT_TYPES } = require('../utils/constants');

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

// Provider/Receiver rolünü davet eden ve kabul eden kurumların türüne göre atar.
function computePartnershipRoles(initiator, current) {
  if (initiator.company_type === 'provider' && current.company_type === 'receiver') {
    return { providerCompanyId: initiator.id, receiverCompanyId: current.id };
  }
  if (initiator.company_type === 'receiver' && current.company_type === 'provider') {
    return { providerCompanyId: current.id, receiverCompanyId: initiator.id };
  }
  return null;
}

async function loadContext(code, currentCompanyId) {
  const invitation = await PartnershipInvitationModel.findActiveByCode(normalizeCode(code));
  if (!invitation) throw new Error('Davet kodu geçersiz veya süresi dolmuş');

  const initiator = await CompanyModel.findById(invitation.initiator_company_id);
  if (!initiator) throw new Error('Davet eden kurum bulunamadı');
  if (!initiator.is_active) throw new Error('Davet eden kurum aktif değil');

  const current = await CompanyModel.findById(currentCompanyId);
  if (!current) throw new Error('Aktif çalışma alanı bulunamadı');
  if (!current.is_active) throw new Error('Kabul edebilmek için kurumun SuperAdmin tarafından onaylanmış olmalı');

  if (invitation.initiator_company_id === current.id) {
    throw new Error('Bu davet kendi kurumun tarafından oluşturuldu');
  }
  if (invitation.target_company_type !== current.company_type) {
    throw new Error(
      `Bu davet ${invitation.target_company_type} tipi bir kurum için oluşturuldu; kurumunun türü uyumsuz`
    );
  }

  const roles = computePartnershipRoles(initiator, current);
  if (!roles) throw new Error('Kurum türleri iş ortaklığına uygun değil');

  const already = await CompanyPartnershipModel.existsActive(
    roles.providerCompanyId, roles.receiverCompanyId
  );
  if (already) throw new Error('Bu iki kurum arasında zaten aktif bir iş ortaklığı var');

  const contract = await ContractTemplateService.getEffective(initiator.id, CONTRACT_TYPES.PARTNERSHIP);

  return { invitation, initiator, current, roles, contract };
}

async function getRedeemPreview(code, currentCompanyId) {
  const ctx = await loadContext(code, currentCompanyId);
  return {
    invitation: ctx.invitation,
    initiatorCompany: ctx.initiator,
    currentCompany: ctx.current,
    contract: ctx.contract,
  };
}

async function redeem({ code, currentCompanyId, acceptingUserId, contractConsent, ipAddress }) {
  if (!contractConsent) {
    throw new Error('İş ortaklığı sözleşmesini onaylamalısın');
  }

  const ctx = await loadContext(code, currentCompanyId);

  const acceptance = {
    contract_type: CONTRACT_TYPES.PARTNERSHIP,
    template_id: ctx.contract.id || null,
    title_snapshot: ctx.contract.title,
    content_snapshot: ctx.contract.content,
  };

  const partnershipId = await CompanyPartnershipModel.createFromInvitationWithAcceptance({
    invitation: ctx.invitation,
    providerCompanyId: ctx.roles.providerCompanyId,
    receiverCompanyId: ctx.roles.receiverCompanyId,
    acceptingUserId,
    acceptance,
    ipAddress,
  });

  return { partnershipId, initiator: ctx.initiator };
}

async function rejectByAdmin({ code, userId }) {
  const invitation = await PartnershipInvitationModel.findActiveByCode(normalizeCode(code));
  if (!invitation) throw new Error('Davet kodu geçersiz veya süresi dolmuş');

  const affected = await PartnershipInvitationModel.rejectByAdmin(invitation.id, userId);
  if (!affected) throw new Error('Davet artık geçerli değil');

  return { initiator_company_id: invitation.initiator_company_id };
}

module.exports = { getRedeemPreview, redeem, rejectByAdmin };
