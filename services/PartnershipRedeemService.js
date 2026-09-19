const PartnershipInvitationModel = require('../models/PartnershipInvitationModel');
const CompanyPartnershipModel = require('../models/CompanyPartnershipModel');
const CompanyModel = require('../models/CompanyModel');
const ContractTemplateService = require('./ContractTemplateService');
const FleetReadinessService = require('./FleetReadinessService');
const NotificationService = require('./NotificationService');
const AuditService = require('./AuditService');
const { CONTRACT_TYPES, AUDIT_ACTIONS } = require('../utils/constants');

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

  // Karşılaştırma sadece receiver redeem yaparken anlamlı — çünkü şablon receiver'da.
  // (Provider redeem yaparken karşı taraf receiver, receiver'ın filosu yok.)
  let fleetReadiness = null;
  const currentIsReceiver = ctx.current.id === ctx.roles.receiverCompanyId;
  if (currentIsReceiver) {
    fleetReadiness = await FleetReadinessService.evaluateProviderAgainstReceiver(
      ctx.roles.providerCompanyId,
      ctx.roles.receiverCompanyId,
      { invitationId: ctx.invitation.id },
    );
  }

  return {
    invitation: ctx.invitation,
    initiatorCompany: ctx.initiator,
    currentCompany: ctx.current,
    contract: ctx.contract,
    fleetReadiness,
  };
}

async function redeem({ code, currentCompanyId, acceptingUserId, contractConsent, ipAddress }) {
  if (!contractConsent) {
    throw new Error('İş ortaklığı sözleşmesini onaylamalısın');
  }

  const ctx = await loadContext(code, currentCompanyId);

  // Receiver kabul ediyorsa: karşı tarafın filosunun receiver'ın belge şablonuna
  // uyduğunu doğrula. Uymuyorsa partnership kurulamaz — karşı taraf önce
  // eksikleri gidermeli.
  const currentIsReceiver = ctx.current.id === ctx.roles.receiverCompanyId;
  if (currentIsReceiver) {
    const readiness = await FleetReadinessService.evaluateProviderAgainstReceiver(
      ctx.roles.providerCompanyId, ctx.roles.receiverCompanyId,
      { invitationId: ctx.invitation.id },
    );
    if (!readiness.allReady) {
      const totalMissing = readiness.drivers.missing.length
                         + readiness.vehicles.missing.length
                         + readiness.hostesses.missing.length;
      throw new Error(
        `Karşı tarafın filosunda ${totalMissing} üyede belge eksik. ` +
        `Ortaklık kurulamaz — karşı taraf önce eksikleri tamamlamalı.`
      );
    }
  }

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

  AuditService.log({
    actorUserId: acceptingUserId,
    companyId: currentCompanyId,
    action: AUDIT_ACTIONS.PARTNERSHIP_REDEEM,
    entityType: 'partnership',
    entityId: partnershipId,
    metadata: {
      providerCompanyId: ctx.roles.providerCompanyId,
      receiverCompanyId: ctx.roles.receiverCompanyId,
    },
    ipAddress,
  });

  return { partnershipId, initiator: ctx.initiator };
}

async function rejectByAdmin({ code, userId, ipAddress }) {
  const invitation = await PartnershipInvitationModel.findActiveByCode(normalizeCode(code));
  if (!invitation) throw new Error('Davet kodu geçersiz veya süresi dolmuş');

  const affected = await PartnershipInvitationModel.rejectByAdmin(invitation.id, userId);
  if (!affected) throw new Error('Davet artık geçerli değil');

  AuditService.log({
    actorUserId: userId,
    action: AUDIT_ACTIONS.PARTNERSHIP_REJECT,
    entityType: 'partnership_invitation',
    entityId: invitation.id,
    metadata: { initiatorCompanyId: invitation.initiator_company_id },
    ipAddress,
  });

  return { initiator_company_id: invitation.initiator_company_id };
}

/**
 * "Reddet + eksik özeti bildir" akışı.
 * Sadece receiver kullanır: karşı tarafın filosu şablona uymuyorsa, redi
 * gerekçesini otomatik hazırlanan mesajla provider'a iletir.
 * Adımlar:
 *   1) Preview context yükle + readiness hesapla
 *   2) Daveti reddet
 *   3) Provider manager'larına bildirim gönder (NotificationService)
 */
async function rejectWithReadinessNotice({ code, currentCompanyId, userId }) {
  const ctx = await loadContext(code, currentCompanyId);

  const currentIsReceiver = ctx.current.id === ctx.roles.receiverCompanyId;
  if (!currentIsReceiver) {
    throw new Error('Bu işlem sadece hizmet alan kurumun kullanabileceği bir reddir');
  }

  const readiness = await FleetReadinessService.evaluateProviderAgainstReceiver(
    ctx.roles.providerCompanyId, ctx.roles.receiverCompanyId,
    { invitationId: ctx.invitation.id },
  );

  // Reddet — mevcut rejectByAdmin akışı
  const affected = await PartnershipInvitationModel.rejectByAdmin(ctx.invitation.id, userId);
  if (!affected) throw new Error('Davet artık geçerli değil');

  // Provider manager'larına bildirim gönder — eksik özetiyle beraber
  await NotificationService.notifyPartnershipRejection(
    ctx.roles.providerCompanyId,
    ctx.current,   // receiver company — mesajda "X kurumu davetinizi reddetti" için
    readiness,
  );

  return { initiator_company_id: ctx.invitation.initiator_company_id };
}

module.exports = { getRedeemPreview, redeem, rejectByAdmin, rejectWithReadinessNotice };
