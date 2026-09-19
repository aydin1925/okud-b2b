const FleetConnectionModel = require('../models/FleetConnectionModel');
const DriverProfileModel   = require('../models/DriverProfileModel');
const VehicleProfileModel  = require('../models/VehicleProfileModel');
const HostessProfileModel  = require('../models/HostessProfileModel');
const DocumentModel        = require('../models/DocumentModel');
const UserModel            = require('../models/UserModel');
const db                   = require('../config/db');
const {
  DRIVER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  HOSTESS_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  OWNER_TYPES,
  DOC_EXPIRY_THRESHOLDS_DAYS,
  AUDIT_ACTIONS,
} = require('../utils/constants');
const AuditService = require('./AuditService');

const EXPIRING_SOON_DAYS = Math.max(...DOC_EXPIRY_THRESHOLDS_DAYS); // 30

// ─────────── yardımcılar ───────────

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(future, base) {
  const ms = new Date(future).getTime() - base.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Bir profil için gereken belgeleri gez; her biri için detaylı durum objesi üret.
async function computeDocStatuses(ownerType, ownerId, requiredTypes) {
  const t = today();
  const results = [];

  for (const type of requiredTypes) {
    const doc = await DocumentModel.findLatestByType(ownerType, ownerId, type);
    const label = DOCUMENT_TYPE_LABELS[type] || type;

    if (!doc) {
      results.push({ type, label, doc: null, ok: false, expiring: false, daysLeft: null, reason: `${label} yüklenmedi` });
      continue;
    }
    if (doc.verification_status === 'pending') {
      results.push({ type, label, doc, ok: false, expiring: false, daysLeft: null, reason: `${label} onay bekliyor` });
      continue;
    }
    if (doc.verification_status === 'rejected') {
      results.push({ type, label, doc, ok: false, expiring: false, daysLeft: null, reason: `${label} reddedildi` });
      continue;
    }
    // verified
    const daysLeft = doc.expires_at ? daysBetween(doc.expires_at, t) : null;
    if (daysLeft !== null && daysLeft < 0) {
      results.push({ type, label, doc, ok: false, expiring: false, daysLeft, reason: `${label} süresi doldu (${doc.expires_at})` });
      continue;
    }
    const expiring = daysLeft !== null && daysLeft <= EXPIRING_SOON_DAYS;
    results.push({
      type, label, doc, ok: true, expiring, daysLeft,
      reason: expiring ? `${label} ${daysLeft} gün sonra doluyor` : null,
    });
  }

  return results;
}

// Profil aktifliği + belge durumundan genel status türet.
function deriveMemberStatus(profileActive, docStatuses) {
  const issues = [];
  let hasProblem = false;
  let hasWarning = false;

  if (!profileActive) {
    hasProblem = true;
    issues.push('Profil aktif değil');
  }

  for (const s of docStatuses) {
    if (!s.ok) {
      hasProblem = true;
      if (s.reason) issues.push(s.reason);
    } else if (s.expiring) {
      hasWarning = true;
      if (s.reason) issues.push(s.reason);
    }
  }

  let status = 'ready';
  if (hasProblem) status = 'problem';
  else if (hasWarning) status = 'warning';

  return { status, issues };
}

function emptyStats() {
  return { total: 0, ready: 0, warning: 0, problem: 0 };
}

function tallyStats(members) {
  const s = emptyStats();
  for (const m of members) {
    s.total++;
    s[m.status]++;
  }
  return s;
}

// ─────────── public: liste ───────────

async function listDrivers(companyId) {
  const rows = await FleetConnectionModel.findActiveDriversForCompany(companyId);
  const members = [];

  for (const r of rows) {
    const docStatuses = await computeDocStatuses(
      OWNER_TYPES.DRIVER_PROFILE, r.profile_id, DRIVER_DOCUMENT_TYPES
    );
    const { status, issues } = deriveMemberStatus(r.profile_status === 'active', docStatuses);

    members.push({
      profileId: r.profile_id,
      connectionId: r.connection_id,
      name: `${r.first_name} ${r.last_name}`,
      subtext: `${r.license_class} sınıfı ehliyet · ${r.email}`,
      status,
      issues,
      connectedAt: r.connected_at,
      paused: !!r.paused_at,
    });
  }

  return { members, stats: tallyStats(members) };
}

async function listVehicles(companyId) {
  const rows = await FleetConnectionModel.findActiveVehiclesForCompany(companyId);
  const members = [];

  for (const r of rows) {
    // Aracın kendi belgeleri
    const vehicleDocStatuses = await computeDocStatuses(
      OWNER_TYPES.VEHICLE_PROFILE, r.profile_id, VEHICLE_DOCUMENT_TYPES
    );

    // Araca atanmış aktif hostes (varsa) — belgeleri de araç sağlığına dahil
    const hostess = await HostessProfileModel.findActiveByVehicleId(r.profile_id);
    let hostessDocStatuses = [];
    if (hostess) {
      hostessDocStatuses = await computeDocStatuses(
        OWNER_TYPES.HOSTESS_PROFILE, hostess.id, HOSTESS_DOCUMENT_TYPES
      );
      // Hostes belgelerinin issue mesajlarına ön ek koy — kaynağı belli olsun
      for (const s of hostessDocStatuses) {
        if (s.reason) s.reason = `Hostes: ${s.reason}`;
      }
    }

    const allDocStatuses = [...vehicleDocStatuses, ...hostessDocStatuses];

    // Araç aktif değilse ya da hostes varken hostes aktif değilse — problem
    const profileActive = r.profile_status === 'active';
    const hostessActive = !hostess || hostess.status === 'active';
    const overallActive = profileActive && hostessActive;

    const { status, issues } = deriveMemberStatus(overallActive, allDocStatuses);

    members.push({
      profileId: r.profile_id,
      connectionId: r.connection_id,
      name: r.plate_number,
      subtext: `${r.brand} ${r.model} (${r.year}) · ${r.capacity} kişi · Sahip: ${r.owner_first_name} ${r.owner_last_name}`
              + (hostess ? ` · Hostes: ${hostess.first_name} ${hostess.last_name}` : ''),
      status,
      issues,
      connectedAt: r.connected_at,
      paused: !!r.paused_at,
      hostess: hostess ? {
        id: hostess.id,
        name: `${hostess.first_name} ${hostess.last_name}`,
        status: hostess.status,
      } : null,
    });
  }

  return { members, stats: tallyStats(members) };
}

// ─────────── public: detay ───────────

async function getMemberDetail(companyId, type, memberId) {
  const targetType = type === 'driver' ? OWNER_TYPES.DRIVER_PROFILE : OWNER_TYPES.VEHICLE_PROFILE;
  const requiredTypes = type === 'driver' ? DRIVER_DOCUMENT_TYPES : VEHICLE_DOCUMENT_TYPES;

  // Ownership check — bu hedef bu kurumun aktif filosunda mı?
  const connection = await FleetConnectionModel.findActiveByTarget(companyId, targetType, memberId);
  if (!connection) {
    throw new Error('Bu üye kurumun aktif filosunda değil');
  }

  // Profili çek
  let profile, ownerName;
  if (type === 'driver') {
    profile = await DriverProfileModel.findById(memberId);
    if (!profile) throw new Error('Şoför profili bulunamadı');
  } else {
    profile = await VehicleProfileModel.findById(memberId);
    if (!profile) throw new Error('Araç profili bulunamadı');
  }

  const docStatuses = await computeDocStatuses(targetType, memberId, requiredTypes);
  const { status, issues } = deriveMemberStatus(profile.status === 'active', docStatuses);

  // İlişkili kişi/varlıklar — kurum panelinden karşılıklı gezinme için
  const related = {};

  if (type === 'vehicle') {
    // Sahibi + varsa onun (aynı fleet'teki) şoför profilini çek
    const owner = await UserModel.findById(profile.owner_user_id);
    if (owner) {
      related.owner = {
        id: owner.id,
        name: `${owner.first_name} ${owner.last_name}`,
        email: owner.email,
      };
      const ownerDriver = await DriverProfileModel.findByUserId(owner.id);
      if (ownerDriver) {
        const inFleet = await FleetConnectionModel.findActiveByTarget(
          companyId, OWNER_TYPES.DRIVER_PROFILE, ownerDriver.id
        );
        if (inFleet) {
          related.ownerDriverProfileId = ownerDriver.id;
          related.ownerDriverStatus = ownerDriver.status;
        } else {
          related.ownerDriverExists = true;   // profil var ama bu filoda değil
        }
      }
    }
  } else if (type === 'driver') {
    // Bu şoförün user'ı adına kayıtlı, bu filoda olan araçlar
    const driverUser = await UserModel.findById(profile.user_id);
    if (driverUser) {
      related.driverUser = {
        id: driverUser.id,
        name: `${driverUser.first_name} ${driverUser.last_name}`,
        email: driverUser.email,
      };
      const ownedVehicles = await VehicleProfileModel.findByOwnerUserId(driverUser.id);
      if (ownedVehicles.length > 0) {
        // Bu filodaki olanları filtrele
        related.ownedVehiclesInFleet = [];
        for (const v of ownedVehicles) {
          const inFleet = await FleetConnectionModel.findActiveByTarget(
            companyId, OWNER_TYPES.VEHICLE_PROFILE, v.id
          );
          if (inFleet) {
            related.ownedVehiclesInFleet.push({
              id: v.id,
              plate_number: v.plate_number,
              brand: v.brand,
              model: v.model,
              status: v.status,
            });
          }
        }
      }
    }
  }

  return {
    type,
    profile,
    connection,
    paused: !!connection.paused_at,
    docStatuses,
    status,
    issues,
    related,
  };
}

/**
 * Kurumun bir filo üyesini geçici pasife alır ya da tekrar aktifleştirir.
 *   type: 'driver' | 'vehicle'
 *   memberId: profile id
 *   paused: true → pause, false → resume
 * Ownership: connection'ın bu kurumda olduğunu bulup üzerinden çalışır.
 */
async function setPaused(companyId, type, memberId, paused, userId, ipAddress) {
  const targetType = type === 'driver' ? OWNER_TYPES.DRIVER_PROFILE : OWNER_TYPES.VEHICLE_PROFILE;
  const connection = await FleetConnectionModel.findActiveByTarget(companyId, targetType, memberId);
  if (!connection) throw new Error('Bu üye kurumun aktif filosunda değil');

  if (paused) {
    await FleetConnectionModel.pause(connection.id, companyId, userId);
  } else {
    await FleetConnectionModel.resume(connection.id, companyId);
  }

  AuditService.log({
    actorUserId: userId,
    companyId,
    action: paused ? AUDIT_ACTIONS.FLEET_PAUSE : AUDIT_ACTIONS.FLEET_RESUME,
    entityType: 'fleet_connection',
    entityId: connection.id,
    metadata: { memberType: targetType, memberId },
    ipAddress,
  });
}

module.exports = { listDrivers, listVehicles, getMemberDetail, setPaused };
