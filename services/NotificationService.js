// NotificationService.js
const DocumentModel = require('../models/DocumentModel');
const NotificationModel = require('../models/NotificationModel');
const DriverProfileModel = require('../models/DriverProfileModel');
const VehicleProfileModel = require('../models/VehicleProfileModel');
const UserModel = require('../models/UserModel');
const FleetConnectionModel = require('../models/FleetConnectionModel');
const CompanyModel = require('../models/CompanyModel');
const MailService = require('./MailService');
const DriverProfileService = require('./DriverProfileService');
const VehicleProfileService = require('./VehicleProfileService');

const {
    DOC_EXPIRY_THRESHOLDS_DAYS,
    NOTIFICATION_TYPES,
    DOCUMENT_TYPE_LABELS,
    TARGET_TYPE_LABELS,
    OWNER_TYPES,
} = require('../utils/constants');

function today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function daysBetween(future, base) {
    const ms = new Date(future).getTime() - base.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function pickThreshold(daysLeft) {
  // Küçükten büyüğe sıralı liste — ilk uyan eşiği döndür (yoksa null)
  return DOC_EXPIRY_THRESHOLDS_DAYS.find(t => t >= daysLeft) || null;
}

async function resolveOwnerUser(doc) {
    let ownerUserId = null;
    if(doc.owner_type === OWNER_TYPES.DRIVER_PROFILE) {
        const profile = await DriverProfileModel.findById(doc.owner_id);
        ownerUserId = profile ? profile.user_id : null;
    }
    else if(doc.owner_type === OWNER_TYPES.VEHICLE_PROFILE) {
        const vehicle = await VehicleProfileModel.findById(doc.owner_id);
        ownerUserId = vehicle ? vehicle.owner_user_id : null;
    }
    if(!ownerUserId) {
        return null;
    }
    return UserModel.findById(ownerUserId);
}

// ============================================================
// Kişisel bildirim — belgenin sahibi kullanıcıya
// ============================================================
async function notifyDocumentExpiring(doc, ownerUser, thresholdDays) {
    const already = await NotificationModel.existsForDocumentAndTypeAndThresholdAndUser(
      doc.id, NOTIFICATION_TYPES.DOC_EXPIRING, thresholdDays, ownerUser.id
    );
    if (already) {
        return false;
    }
    const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
    const urgent = thresholdDays <= 7;
    const title = `${urgent ? 'ACİL - ' : ''}${label} belgen ${thresholdDays} günden az bir sürede doluyor`;
    const message =
     `Merhaba ${ownerUser.first_name}, \n\n` +
     `${label} belgenin son geçerlilik tarihi: ${doc.expires_at}. \n` +
     `Belgeyi yenileyip yeni versiyonunu sisteme yüklemen gerekiyor. ` +
     `Aksi halde süresi dolduğunda profilin otomatik pasife düşecek.\n\n` +
     `— OKUD`;

    const emailSentAt = await MailService.send({
        to: ownerUser.email, subject: title, body: message,
    });

    await NotificationModel.create({
        user_id: ownerUser.id,
        company_id: null,
        type: NOTIFICATION_TYPES.DOC_EXPIRING,
        document_id: doc.id,
        threshold_days: thresholdDays,
        title, message,
        email_sent_at: emailSentAt,
    });

    return true;
}

async function notifyDocumentExpired(doc, ownerUser) {
  const already = await NotificationModel.existsForDocumentAndTypeAndThresholdAndUser(
    doc.id, NOTIFICATION_TYPES.DOC_EXPIRED, null, ownerUser.id
  );
  if (already) {
    // Bildirim gönderilmiş ama profil durumu yine de senkron olsun
    await triggerRecompute(doc);
    return false;
  }

  const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
  const title = `${label} belgenin süresi doldu`;
  const message =
    `Merhaba ${ownerUser.first_name},\n\n` +
    `${label} belgenin son geçerlilik tarihi (${doc.expires_at}) geçti. ` +
    `Profilin "belge bekleniyor" durumuna düşürüldü ve yeni bir kuruma bağlanamayacaksın.\n` +
    `Yenilenmiş belgeyi sisteme yükledikten ve moderatör onayını aldıktan sonra profilin tekrar aktif olur.\n\n` +
    `— OKUD`;

  const emailSentAt = await MailService.send({
    to: ownerUser.email, subject: title, body: message,
  });

  await NotificationModel.create({
    user_id: ownerUser.id,
    company_id: null,
    type: NOTIFICATION_TYPES.DOC_EXPIRED,
    document_id: doc.id,
    threshold_days: null,
    title, message,
    email_sent_at: emailSentAt,
  });

  await triggerRecompute(doc);
  return true;
}

// ============================================================
// Kurum bağlamlı bildirim — belgeye aktif bağlı her kurumun manager'larına
// ============================================================
function ownerLabel(doc, ownerUser) {
  const kind = TARGET_TYPE_LABELS[doc.owner_type] || 'Filo üyesi';
  const name = ownerUser ? `${ownerUser.first_name} ${ownerUser.last_name}` : '';
  return name ? `${kind}: ${name}` : kind;
}

async function notifyCompanyManagersDocExpiring(doc, ownerUser, thresholdDays) {
  const companies = await FleetConnectionModel.findActiveCompaniesByOwner(doc.owner_type, doc.owner_id);
  if (companies.length === 0) return 0;

  const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
  const urgent = thresholdDays <= 7;
  let sent = 0;

  for (const company of companies) {
    const managers = await CompanyModel.findManagersByCompanyId(company.id);
    for (const mgr of managers) {
      const already = await NotificationModel.existsForDocumentAndTypeAndThresholdAndUser(
        doc.id, NOTIFICATION_TYPES.DOC_EXPIRING, thresholdDays, mgr.id
      );
      if (already) continue;

      const title = `${urgent ? 'ACİL - ' : ''}Filondaki ${label.toLowerCase()} belgesi ${thresholdDays} gün içinde doluyor`;
      const message =
        `Merhaba ${mgr.first_name},\n\n` +
        `${company.name} filondaki ${ownerLabel(doc, ownerUser)} için ${label} belgesinin ` +
        `son geçerlilik tarihi ${doc.expires_at}. \n` +
        `Belge yenilenmezse süresi dolduğunda ilgili şoför/araç filondan otomatik olarak pasife düşer. ` +
        `Filo panelinden takip edebilirsin.\n\n` +
        `— OKUD`;

      const emailSentAt = await MailService.send({
        to: mgr.email, subject: title, body: message,
      });

      await NotificationModel.create({
        user_id: mgr.id,
        company_id: company.id,
        type: NOTIFICATION_TYPES.DOC_EXPIRING,
        document_id: doc.id,
        threshold_days: thresholdDays,
        title, message,
        email_sent_at: emailSentAt,
      });
      sent++;
    }
  }
  return sent;
}

async function notifyCompanyManagersDocExpired(doc, ownerUser) {
  const companies = await FleetConnectionModel.findActiveCompaniesByOwner(doc.owner_type, doc.owner_id);
  if (companies.length === 0) return 0;

  const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
  let sent = 0;

  for (const company of companies) {
    const managers = await CompanyModel.findManagersByCompanyId(company.id);
    for (const mgr of managers) {
      const already = await NotificationModel.existsForDocumentAndTypeAndThresholdAndUser(
        doc.id, NOTIFICATION_TYPES.DOC_EXPIRED, null, mgr.id
      );
      if (already) continue;

      const title = `Filondaki ${label.toLowerCase()} belgesinin süresi doldu`;
      const message =
        `Merhaba ${mgr.first_name},\n\n` +
        `${company.name} filondaki ${ownerLabel(doc, ownerUser)} için ${label} belgesinin ` +
        `son geçerlilik tarihi (${doc.expires_at}) geçti. ` +
        `İlgili profil "belge bekleniyor" durumuna düşürüldü ve operasyonel filoda görünmüyor.\n\n` +
        `— OKUD`;

      const emailSentAt = await MailService.send({
        to: mgr.email, subject: title, body: message,
      });

      await NotificationModel.create({
        user_id: mgr.id,
        company_id: company.id,
        type: NOTIFICATION_TYPES.DOC_EXPIRED,
        document_id: doc.id,
        threshold_days: null,
        title, message,
        email_sent_at: emailSentAt,
      });
      sent++;
    }
  }
  return sent;
}

async function triggerRecompute(doc) {
  if (doc.owner_type === OWNER_TYPES.DRIVER_PROFILE) {
    await DriverProfileService.recomputeStatus(doc.owner_id);
  } else if (doc.owner_type === OWNER_TYPES.VEHICLE_PROFILE) {
    await VehicleProfileService.recomputeStatus(doc.owner_id);
  }
}

// ============================================================
// Cron kanalı — her verified belge için kişisel + kurum bildirimlerini tetikle
// ============================================================
async function scanDocumentExpiries() {
  const docs = await DocumentModel.findAllVerifiedWithExpiry();
  const t = today();
  const summary = {
    processed: 0, expiring: 0, expired: 0, skipped: 0, errors: 0,
    companyExpiring: 0, companyExpired: 0,
  };

  for (const doc of docs) {
    summary.processed++;
    try {
      const daysLeft = daysBetween(doc.expires_at, t);
      const ownerUser = await resolveOwnerUser(doc);
      if (!ownerUser) { summary.skipped++; continue; }

      if (daysLeft < 0) {
        const sent = await notifyDocumentExpired(doc, ownerUser);
        if (sent) summary.expired++;
        // Süre dolmuş — recompute sonrası filoda kalmamış olabilir; yine de kayıttaki
        // kurumlara "dolduğu için düştü" bildirimi düşür.
        summary.companyExpired += await notifyCompanyManagersDocExpired(doc, ownerUser);
        continue;
      }

      const threshold = pickThreshold(daysLeft);
      if (!threshold) { summary.skipped++; continue; }

      const sent = await notifyDocumentExpiring(doc, ownerUser, threshold);
      if (sent) summary.expiring++;
      summary.companyExpiring += await notifyCompanyManagersDocExpiring(doc, ownerUser, threshold);
    } catch (err) {
      summary.errors++;
      console.error(`[scan] doc #${doc.id} hata:`, err.message);
    }
  }

  return summary;
}

// ============================================================
// Sunum katmanı için
// ============================================================
async function listForUser(userId, opts = {}) {
  return NotificationModel.findByUserId(userId, opts);
}

async function countsForUser(userId) {
  return NotificationModel.countsByUser(userId);
}

async function markAsRead(id, userId) {
  await NotificationModel.markAsRead(id, userId);
}

async function markAllAsRead(userId) {
  await NotificationModel.markAllAsRead(userId);
}

async function deleteOne(id, userId) {
  await NotificationModel.softDelete(id, userId);
}

async function deleteAllForUser(userId, opts = {}) {
  return NotificationModel.softDeleteAllForUser(userId, opts);
}

module.exports = {
  scanDocumentExpiries,
  notifyDocumentExpiring,
  notifyDocumentExpired,
  notifyCompanyManagersDocExpiring,
  notifyCompanyManagersDocExpired,
  listForUser,
  countsForUser,
  markAsRead,
  markAllAsRead,
  deleteOne,
  deleteAllForUser,
};
