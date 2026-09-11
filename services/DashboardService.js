// DashboardService.js
// Dashboard'ın 3 modu (personal / provider / receiver) için veri toplayan servis.
const CompanyService            = require('./CompanyService');
const FleetOverviewService      = require('./FleetOverviewService');
const FleetReadinessService     = require('./FleetReadinessService');
const VehicleProfileService     = require('./VehicleProfileService');
const DriverProfileService      = require('./DriverProfileService');
const HostessProfileService     = require('./HostessProfileService');
const DocumentService           = require('./DocumentService');
const CompanyPartnershipModel   = require('../models/CompanyPartnershipModel');
const { DOCUMENT_TYPE_LABELS }  = require('../utils/constants');

/**
 * Kişisel mod — kurum aktif değilken.
 * Şoför + araç + hostes özet kartları + tüm belgeler için gerekli data.
 * Belgeler: sürücü belgeleri + her araca ait belgeler + her hostesin belgeleri —
 * hepsi düzleştirilir, dashboard'da tek liste halinde gösterilir.
 */
async function personalOverview(userId) {
  const [companies, vehicles, driverProfile, hostesses] = await Promise.all([
    CompanyService.listForUser(userId),
    VehicleProfileService.listForUser(userId),
    DriverProfileService.getMyProfile(userId),
    HostessProfileService.listForUser(userId),
  ]);

  // Belgeleri topla
  const labelOf = (t) => DOCUMENT_TYPE_LABELS[t] || t;
  const documentSources = [];
  if (driverProfile) {
    documentSources.push(DocumentService.listForDriverByUser(userId).then(docs => docs.map(d => ({
      ...d, owner_kind: 'driver', owner_label: 'Şoför', type_label: labelOf(d.document_type),
    }))));
  }
  for (const v of vehicles) {
    documentSources.push(DocumentService.listForVehicle(v.id).then(docs => docs.map(d => ({
      ...d, owner_kind: 'vehicle', owner_label: v.plate_number || 'Araç', type_label: labelOf(d.document_type),
    }))));
  }
  for (const h of hostesses) {
    documentSources.push(DocumentService.listForHostess(h.id).then(docs => docs.map(d => ({
      ...d, owner_kind: 'hostess', owner_label: `${h.first_name || ''} ${h.last_name || ''}`.trim() || 'Hostes', type_label: labelOf(d.document_type),
    }))));
  }
  const documentGroups = await Promise.all(documentSources);
  const documents = documentGroups.flat();

  return { companies, vehicles, driverProfile, hostesses, documents };
}

/**
 * Provider mod — hizmet veren kurum aktif iken.
 * Üç blok döner:
 *   - fleetHealth: filo sağlık sayaçları (şoför + araç birlikte + ayrı ayrı)
 *   - partnerships: aktif iş ortaklıkları (karşı taraf perspektifi ile)
 *   - alerts: kritik uyarılar (problem + warning üyelerin en fazla 6 tanesi)
 */
async function providerOverview(companyId) {
  const [drivers, vehicles, partnerships] = await Promise.all([
    FleetOverviewService.listDrivers(companyId),
    FleetOverviewService.listVehicles(companyId),
    CompanyPartnershipModel.findActiveByCompany(companyId),
  ]);

  // Birleşik sayaç — şoför + araç
  const combined = {
    total:   drivers.stats.total   + vehicles.stats.total,
    ready:   drivers.stats.ready   + vehicles.stats.ready,
    warning: drivers.stats.warning + vehicles.stats.warning,
    problem: drivers.stats.problem + vehicles.stats.problem,
  };

  // Karşı taraf perspektifi — companyId ya provider ya receiver olabilir
  const partnersView = partnerships.map(p => {
    const isProvider = p.provider_company_id === companyId;
    return {
      id: p.id,
      partnerName: isProvider ? p.receiver_name : p.provider_name,
      partnerType: isProvider ? p.receiver_type : p.provider_type,
      startedAt: p.started_at,
    };
  });

  // Kritik uyarılar — problem/warning statülü üyeler
  const alerts = [];
  for (const m of drivers.members) {
    if (m.status !== 'ready') {
      alerts.push({
        kind: 'driver',
        name: m.name,
        status: m.status,
        issues: m.issues.slice(0, 2),
        profileId: m.profileId,
      });
    }
  }
  for (const m of vehicles.members) {
    if (m.status !== 'ready') {
      alerts.push({
        kind: 'vehicle',
        name: m.name,
        status: m.status,
        issues: m.issues.slice(0, 2),
        profileId: m.profileId,
      });
    }
  }
  // Öncelik: problem > warning
  alerts.sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'problem' ? -1 : 1;
  });

  return {
    fleetHealth: {
      combined,
      drivers: drivers.stats,
      vehicles: vehicles.stats,
    },
    partnerships: partnersView,
    alerts: alerts.slice(0, 6),
  };
}

/**
 * Receiver mod — hizmet alan kurum aktif iken.
 * Receiver kendi filoya sahip değil; hizmeti sağlayan provider kurumlar üzerinden
 * hizmet alır. Kritik detay: filo değerlendirmesi **receiver'ın belge şablonuna** göre
 * yapılır (sistem-tanımlı belgelere göre değil). Yani receiver "Ehliyet + Sağlık
 * raporu isterim" derse, provider'ın şoförünün SRC'si olsa da olmasa da fark etmez;
 * bu iki belge var mı ona bakılır.
 *
 * Döner:
 *   - partners: her ortağın receiver-şablonuna göre hazırlık durumu
 *   - combined: tüm ortakların birleşik sayacı (ready / problem)
 *   - alerts: uyum sağlamayan üyeler (partnerName + hangi belge eksik)
 */
async function receiverOverview(companyId) {
  const partnerships = await CompanyPartnershipModel.findActiveByCompany(companyId);

  const partners = [];
  const combined = { total: 0, ready: 0, warning: 0, problem: 0 };
  const alerts = [];

  for (const p of partnerships) {
    // Receiver perspektifi: karşı taraf provider'dır
    const isProvider = p.provider_company_id === companyId;
    const partnerId   = isProvider ? p.receiver_company_id : p.provider_company_id;
    const partnerName = isProvider ? p.receiver_name       : p.provider_name;
    const partnerType = isProvider ? p.receiver_type       : p.provider_type;

    // Bu ortağın filosunu senin şablonuna karşı değerlendir —
    // partnership scope'una göre (provider'ın bu ortaklığa dahil ettiği üyeler).
    const readiness = await FleetReadinessService.evaluateProviderAgainstReceiver(
      partnerId, companyId, { partnershipId: p.id },
    );

    const totalMembers = readiness.drivers.total + readiness.vehicles.total + readiness.hostesses.total;
    const totalReady   = readiness.drivers.ready + readiness.vehicles.ready + readiness.hostesses.ready;
    const totalMissing = readiness.drivers.missing.length
                       + readiness.vehicles.missing.length
                       + readiness.hostesses.missing.length;

    // Şablon karşılaştırması binary — ya uyuyor ya uymuyor. Warning ara durumu yok.
    const partnerStats = {
      total:   totalMembers,
      ready:   totalReady,
      warning: 0,
      problem: totalMissing,
    };
    const status = totalMissing > 0 ? 'problem' : 'ready';

    partners.push({
      id: p.id,
      partnerId,
      partnerName,
      partnerType,
      startedAt: p.started_at,
      driversTotal:  readiness.drivers.total,
      vehiclesTotal: readiness.vehicles.total,
      stats: partnerStats,
      status,
    });

    combined.total   += partnerStats.total;
    combined.ready   += partnerStats.ready;
    combined.problem += partnerStats.problem;

    // Kritik uyarılar — hangi ortakta hangi üyede hangi eksik
    for (const m of readiness.drivers.missing) {
      alerts.push({ partnerName, kind: 'driver',  name: m.name,
                    status: 'problem', issues: m.issues.slice(0, 2) });
    }
    for (const m of readiness.vehicles.missing) {
      alerts.push({ partnerName, kind: 'vehicle', name: m.name,
                    status: 'problem', issues: m.issues.slice(0, 2) });
    }
    for (const m of readiness.hostesses.missing) {
      alerts.push({ partnerName, kind: 'hostess',
                    name: `${m.name} · araç ${m.vehiclePlate}`,
                    status: 'problem', issues: m.issues.slice(0, 2) });
    }
  }

  return {
    partners,
    combined,
    alerts: alerts.slice(0, 6),
  };
}

module.exports = { personalOverview, providerOverview, receiverOverview };
