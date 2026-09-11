const FleetConnectionModel  = require('../models/FleetConnectionModel');
const HostessProfileModel   = require('../models/HostessProfileModel');
const DocumentModel         = require('../models/DocumentModel');
const PartnershipFleetScopeModel = require('../models/PartnershipFleetScopeModel');
const PartnershipInvitationFleetScopeModel = require('../models/PartnershipInvitationFleetScopeModel');
const CompanyDocumentRequirementService = require('./CompanyDocumentRequirementService');
const {
  OWNER_TYPES,
  DOCUMENT_TYPE_LABELS,
} = require('../utils/constants');

/**
 * Bir provider kurumun aktif filosunu, bir receiver kurumun belge gereksinim
 * şablonuna karşı karşılaştırır. Partnership redeem popup'ı, cron uyarıları,
 * filo paneli — hepsi bu hesaplamayı kullanır.
 *
 * Dönen özet:
 *   {
 *     drivers:   { total, ready, missing: [{name, issues[]}] },
 *     vehicles:  { total, ready, missing: [{name, issues[]}] },
 *     hostesses: { total, ready, missing: [{name, vehiclePlate, issues[]}] },
 *     allReady: bool  // hiç eksik yoksa true
 *   }
 */
/**
 * options: { partnershipId?, invitationId? }
 *   partnershipId — kurulmuş bir ortaklığın scope'unu uygular
 *   invitationId  — henüz kabul edilmemiş davetin scope'unu uygular (preview/redeem/reject)
 *   ikisi de yoksa scope filtresi uygulanmaz (tüm filo)
 */
async function evaluateProviderAgainstReceiver(providerCompanyId, receiverCompanyId, options = {}) {
  const { partnershipId = null, invitationId = null } = options;
  const requirements = await CompanyDocumentRequirementService.getRequirements(receiverCompanyId);

  const [driversRaw, vehiclesRaw] = await Promise.all([
    FleetConnectionModel.findActiveDriversForCompany(providerCompanyId),
    FleetConnectionModel.findActiveVehiclesForCompany(providerCompanyId),
  ]);

  // Manuel pasife alınmış üyeler karşı tarafın uyum hesabına dahil edilmez.
  // İki kanaldan pasif olabilir:
  //   1) profile_status='inactive' — sahibi kendi profilini pasife almış (sistem geneli)
  //   2) fc.paused_at IS NOT NULL — bu kurum bu üyeyi kendi filosunda genel pasife almış
  let drivers  = driversRaw.filter(d => d.profile_status !== 'inactive' && !d.paused_at);
  let vehicles = vehiclesRaw.filter(v => v.profile_status !== 'inactive' && !v.paused_at);

  // Scope-özel filtreleme: inclusion listesi (satır varsa dahil).
  // invitationId öncelikli (davet aşaması), yoksa partnershipId (kabul sonrası).
  // İkisi de yoksa scope filtresi yok.
  let driverScope = null, vehicleScope = null;
  if (invitationId != null) {
    [driverScope, vehicleScope] = await Promise.all([
      PartnershipInvitationFleetScopeModel.findIdsByInvitationAndType(invitationId, OWNER_TYPES.DRIVER_PROFILE),
      PartnershipInvitationFleetScopeModel.findIdsByInvitationAndType(invitationId, OWNER_TYPES.VEHICLE_PROFILE),
    ]);
  } else if (partnershipId != null) {
    [driverScope, vehicleScope] = await Promise.all([
      PartnershipFleetScopeModel.findIdsByPartnershipAndType(partnershipId, OWNER_TYPES.DRIVER_PROFILE),
      PartnershipFleetScopeModel.findIdsByPartnershipAndType(partnershipId, OWNER_TYPES.VEHICLE_PROFILE),
    ]);
  }
  if (driverScope)  drivers  = drivers.filter(d => driverScope.has(d.profile_id));
  if (vehicleScope) vehicles = vehicles.filter(v => vehicleScope.has(v.profile_id));

  const summary = {
    drivers:   { total: drivers.length,  ready: 0, missing: [] },
    vehicles:  { total: vehicles.length, ready: 0, missing: [] },
    hostesses: { total: 0,               ready: 0, missing: [] },
  };

  // Şoförler
  for (const d of drivers) {
    const issues = await evaluateMember(
      OWNER_TYPES.DRIVER_PROFILE, d.profile_id, requirements[OWNER_TYPES.DRIVER_PROFILE]
    );
    if (issues.length === 0) {
      summary.drivers.ready++;
    } else {
      summary.drivers.missing.push({
        name: `${d.first_name} ${d.last_name}`,
        issues,
      });
    }
  }

  // Araçlar + araca bağlı hostesler
  for (const v of vehicles) {
    const vehicleIssues = await evaluateMember(
      OWNER_TYPES.VEHICLE_PROFILE, v.profile_id, requirements[OWNER_TYPES.VEHICLE_PROFILE]
    );
    if (vehicleIssues.length === 0) {
      summary.vehicles.ready++;
    } else {
      summary.vehicles.missing.push({
        name: v.plate_number,
        issues: vehicleIssues,
      });
    }

    // Aracın atanmış hostesi varsa onu da değerlendir — pasife alınmışsa yok say
    const hostess = await HostessProfileModel.findActiveByVehicleId(v.profile_id);
    if (hostess && hostess.status !== 'inactive') {
      summary.hostesses.total++;
      const hostessIssues = await evaluateMember(
        OWNER_TYPES.HOSTESS_PROFILE, hostess.id, requirements[OWNER_TYPES.HOSTESS_PROFILE]
      );
      if (hostessIssues.length === 0) {
        summary.hostesses.ready++;
      } else {
        summary.hostesses.missing.push({
          name: `${hostess.first_name} ${hostess.last_name}`,
          vehiclePlate: v.plate_number,
          issues: hostessIssues,
        });
      }
    }
  }

  summary.allReady = summary.drivers.missing.length === 0
                  && summary.vehicles.missing.length === 0
                  && summary.hostesses.missing.length === 0;

  return summary;
}

/**
 * Tek bir üye (şoför/araç/hostes) için, verilen gereksinim listesindeki
 * her belge tipini kontrol eder. Eksik/onaysız/reddedilmiş/süresi dolmuş
 * her belge için kısa bir human-readable string döner.
 */
async function evaluateMember(ownerType, ownerId, requiredTypes) {
  const issues = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const type of requiredTypes) {
    const doc = await DocumentModel.findLatestByType(ownerType, ownerId, type);
    const label = DOCUMENT_TYPE_LABELS[type] || type;

    if (!doc) {
      issues.push(`${label} eksik`);
    } else if (doc.verification_status === 'pending') {
      issues.push(`${label} onay bekliyor`);
    } else if (doc.verification_status === 'rejected') {
      issues.push(`${label} reddedildi`);
    } else if (doc.expires_at && doc.expires_at < today) {
      issues.push(`${label} süresi doldu`);
    }
  }

  return issues;
}

module.exports = { evaluateProviderAgainstReceiver };
