const PartnershipInvitationModel = require('../models/PartnershipInvitationModel');
const PartnershipInvitationFleetScopeModel = require('../models/PartnershipInvitationFleetScopeModel');
const FleetConnectionModel = require('../models/FleetConnectionModel');
const CompanyModel = require('../models/CompanyModel');
const db = require('../config/db');
const { generateCode } = require('../utils/otp');
const { PARTNERSHIP_INVITATION_EXPIRY_MINUTES } = require('../utils/constants');

const MAX_CODE_ATTEMPTS = 5;

// Bir kurumun türünün karşıtı — provider ↔ receiver
function oppositeType(companyType) {
  if (companyType === 'provider') return 'receiver';
  if (companyType === 'receiver') return 'provider';
  return null;
}

/**
 * Davet oluşturma sayfası için hazır provider filo listesi.
 * (Kabul edildiğinde bu scope partnership_fleet_scopes'a kopyalanır.)
 * Sadece provider için anlamlı — receiver çağırırsa boş dizi.
 */
async function getFleetForInvitation(companyId, companyType) {
  if (companyType !== 'provider') {
    return { drivers: [], vehicles: [] };
  }
  const [drivers, vehicles] = await Promise.all([
    FleetConnectionModel.findActiveDriversForCompany(companyId),
    FleetConnectionModel.findActiveVehiclesForCompany(companyId),
  ]);
  return {
    drivers: drivers.map(d => ({
      profile_id:   d.profile_id,
      name:         `${d.first_name} ${d.last_name}`,
      subtext:      `${d.license_class} sınıfı ehliyet · ${d.email}`,
      disabled:     d.profile_status === 'inactive' || !!d.paused_at,
      disabledNote: d.profile_status === 'inactive' ? 'Sahibi pasife almış' : (d.paused_at ? 'Kurum filonda pasif' : null),
    })),
    vehicles: vehicles.map(v => ({
      profile_id:   v.profile_id,
      name:         v.plate_number,
      subtext:      `${v.brand} ${v.model} · ${v.capacity} kişi`,
      disabled:     v.profile_status === 'inactive' || !!v.paused_at,
      disabledNote: v.profile_status === 'inactive' ? 'Sahibi pasife almış' : (v.paused_at ? 'Kurum filonda pasif' : null),
    })),
  };
}

// Kurum admin'i partnership daveti üretir. Provider ise scope ekler.
async function create({ label, driverIds, vehicleIds }, { companyId, userId }) {
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

  // Provider ise scope validasyonu — id'ler kendi aktif filosunda olmalı.
  // Receiver davet üretemiyor (zaten middleware bloklar) ama defensive kalalım.
  let cleanDriverIds = [];
  let cleanVehicleIds = [];
  if (initiator.company_type === 'provider') {
    const norm = (arr) => Array.from(new Set(
      (arr || []).map(x => parseInt(x, 10)).filter(x => Number.isInteger(x) && x > 0)
    ));
    const dIds = norm(driverIds);
    const vIds = norm(vehicleIds);

    const [drivers, vehicles] = await Promise.all([
      FleetConnectionModel.findActiveDriversForCompany(companyId),
      FleetConnectionModel.findActiveVehiclesForCompany(companyId),
    ]);
    const validDriverIds  = new Set(drivers.map(d => d.profile_id));
    const validVehicleIds = new Set(vehicles.map(v => v.profile_id));

    cleanDriverIds  = dIds.filter(id => validDriverIds.has(id));
    cleanVehicleIds = vIds.filter(id => validVehicleIds.has(id));

    if (cleanDriverIds.length === 0 && cleanVehicleIds.length === 0) {
      throw new Error('Bu davet için en az bir şoför veya araç seçmelisin');
    }
  }

  // Davet + scope satırları tek transaction'da — biri düşerse diğeri de düşer.
  const conn = await db.getConnection();
  let invitationId;
  try {
    await conn.beginTransaction();

    const [insRes] = await conn.query(
      `INSERT INTO partnership_invitations
         (initiator_company_id, target_company_type, code, label, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, targetType, code, cleanLabel, expiresAt, userId]
    );
    invitationId = insRes.insertId;

    if (initiator.company_type === 'provider') {
      await PartnershipInvitationFleetScopeModel.setForInvitation(
        invitationId, cleanDriverIds, cleanVehicleIds, userId, conn
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return {
    id: invitationId,
    code,
    target_company_type: targetType,
    label: cleanLabel,
    expires_at: expiresAt,
    expiry_minutes: PARTNERSHIP_INVITATION_EXPIRY_MINUTES,
    scope: {
      driversCount:  cleanDriverIds.length,
      vehiclesCount: cleanVehicleIds.length,
    },
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

module.exports = { create, listPendingForCompany, cancel, oppositeType, getFleetForInvitation };
