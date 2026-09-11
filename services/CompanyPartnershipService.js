const CompanyPartnershipModel = require('../models/CompanyPartnershipModel');
const ContractAcceptanceModel = require('../models/ContractAcceptanceModel');
const CompanyModel = require('../models/CompanyModel');
const PartnershipInvitationModel = require('../models/PartnershipInvitationModel');
const NotificationModel = require('../models/NotificationModel');
const UserModel = require('../models/UserModel');
const { NOTIFICATION_TYPES } = require('../utils/constants');

// Kurumun aktif iş birlikleri — karşı taraf bilgisi türetilmiş şekilde UI'a hazır dizi.
async function listActiveForCompany(companyId) {
  const rows = await CompanyPartnershipModel.findActiveByCompany(companyId);

  return rows.map((r) => {
    // currentCompany hangi kolondaysa karşı taraf öbür kolondur
    const iAmProvider = r.provider_company_id === companyId;
    const counterparty = iAmProvider
      ? { id: r.receiver_company_id, name: r.receiver_name, type: r.receiver_type }
      : { id: r.provider_company_id, name: r.provider_name, type: r.provider_type };

    return {
      id: r.id,
      startedAt: r.started_at,
      myRole: iAmProvider ? 'provider' : 'receiver',
      counterparty,
    };
  });
}

// Ownership check + karşı taraf + sözleşme snapshot ile detay
async function getDetail(companyId, partnershipId) {
  const p = await CompanyPartnershipModel.findById(partnershipId);
  if (!p) throw new Error('İş ortaklığı bulunamadı');

  if (p.provider_company_id !== companyId && p.receiver_company_id !== companyId) {
    throw new Error('Bu iş ortaklığına erişim yetkin yok');
  }

  const iAmProvider = p.provider_company_id === companyId;
  const counterparty = iAmProvider
    ? { id: p.receiver_company_id, name: p.receiver_name, type: p.receiver_type }
    : { id: p.provider_company_id, name: p.provider_name, type: p.provider_type };

  const acceptance = await ContractAcceptanceModel.findByPartnership(partnershipId);
  const counterpartContact = await CompanyModel.findPrimaryContactByCompanyId(counterparty.id);
  const timeline = await buildTimeline(p, counterparty);

  return {
    id: p.id,
    startedAt: p.started_at,
    terminatedAt: p.terminated_at,
    isActive: !p.terminated_at,
    myRole: iAmProvider ? 'provider' : 'receiver',
    counterparty,
    counterpartContact,
    acceptance,
    timeline,
  };
}

/**
 * Ortaklığın hayat çizgisi — kronolojik olarak (eski → yeni):
 *   1) Davet gönderildi (invitation.created_at, oluşturan kullanıcı)
 *   2) Ortaklık başladı (partnership.started_at, kabul eden kullanıcı)
 *   3) Son readiness uyarısı (varsa, sonuncu created_at) — receiver kurumunun bildirim satırından
 *   4) Feshedildi (varsa, terminated_at + terminated_by)
 *
 * Her item: { kind, at, title, subtitle }. UI dikey timeline olarak renderler.
 * Bu sadece view'a hazır dizi — filtreleme veya sıralama UI tarafında yok.
 */
async function buildTimeline(partnership, counterparty) {
  const items = [];

  // 1) Davet gönderildi
  if (partnership.invitation_id) {
    const invitation = await PartnershipInvitationModel.findByIdWithUsers(partnership.invitation_id);
    if (invitation) {
      items.push({
        kind: 'invitation_created',
        at: invitation.created_at,
        title: 'Davet gönderildi',
        subtitle: invitation.created_by_name
          ? `${invitation.created_by_name} tarafından oluşturuldu`
          : 'Davet oluşturuldu',
      });

      // 2) Davet kabul edildi = ortaklık başladı
      items.push({
        kind: 'partnership_started',
        at: partnership.started_at,
        title: 'Ortaklık başladı',
        subtitle: invitation.consumed_by_name
          ? `${invitation.consumed_by_name} tarafından kabul edildi`
          : 'Davet kabul edildi',
      });
    } else {
      items.push({
        kind: 'partnership_started',
        at: partnership.started_at,
        title: 'Ortaklık başladı',
        subtitle: 'Davet kabul edildi',
      });
    }
  } else {
    items.push({
      kind: 'partnership_started',
      at: partnership.started_at,
      title: 'Ortaklık başladı',
      subtitle: null,
    });
  }

  // 3) Son readiness uyarısı — receiver kurumuna düşer, o yüzden receiver_company_id.
  const latestReadinessAt = await NotificationModel.findLatestByCompanyAndType(
    partnership.receiver_company_id,
    NOTIFICATION_TYPES.PARTNERSHIP_READINESS_ALERT
  );
  if (latestReadinessAt && new Date(latestReadinessAt) >= new Date(partnership.started_at)) {
    items.push({
      kind: 'readiness_alert',
      at: latestReadinessAt,
      title: 'Filo uyum uyarısı düştü',
      subtitle: 'Karşı tarafın belgelerinde eksik/geçersiz kalem tespit edildi',
    });
  }

  // 4) Fesih
  if (partnership.terminated_at) {
    let terminatorName = null;
    if (partnership.terminated_by_user_id) {
      const u = await UserModel.findById(partnership.terminated_by_user_id);
      if (u) terminatorName = `${u.first_name} ${u.last_name}`.trim();
    }
    items.push({
      kind: 'partnership_terminated',
      at: partnership.terminated_at,
      title: 'Ortaklık feshedildi',
      subtitle: terminatorName ? `${terminatorName} tarafından` : null,
    });
  }

  // Kronolojik sırala (eski → yeni)
  items.sort((a, b) => new Date(a.at) - new Date(b.at));
  return items;
}

async function terminate(partnershipId, companyId, userId, reason) {
  const p = await CompanyPartnershipModel.findById(partnershipId);
  if (!p) throw new Error('İş ortaklığı bulunamadı');

  if (p.provider_company_id !== companyId && p.receiver_company_id !== companyId) {
    throw new Error('Bu iş ortaklığını feshetme yetkin yok');
  }
  if (p.terminated_at) throw new Error('Bu iş ortaklığı zaten feshedilmiş');

  const affected = await CompanyPartnershipModel.terminate(partnershipId, userId);
  if (!affected) throw new Error('Fesih işlemi başarısız (belki eş zamanlı işlem)');

  // Fesih başarılı — karşı taraf manager'larına bildirim (bloklamaz, hata olsa da fesih kalır)
  try {
    const NotificationService = require('./NotificationService');
    const iAmProvider = p.provider_company_id === companyId;
    const counterpartCompanyId = iAmProvider ? p.receiver_company_id : p.provider_company_id;
    const terminatorCompany = await CompanyModel.findById(companyId);
    const terminatorUser = await UserModel.findById(userId);
    await NotificationService.notifyPartnershipTerminated({
      terminatorCompany,
      counterpartCompanyId,
      terminatorUser,
      reason,
    });
  } catch (err) {
    console.error('[partnership] fesih bildirimi başarısız:', err.message);
  }
}

module.exports = { listActiveForCompany, getDetail, terminate };
