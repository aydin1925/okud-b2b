const PartnershipFleetScopeModel = require('../models/PartnershipFleetScopeModel');
const CompanyPartnershipModel    = require('../models/CompanyPartnershipModel');
const FleetConnectionModel       = require('../models/FleetConnectionModel');
const { OWNER_TYPES } = require('../utils/constants');

/**
 * Provider kurumun bir iş ortaklığı için filo scope'unu okur — kullanıcıya
 * hazır liste döner: provider'ın tüm filosu + hangilerinin bu ortaklığa dahil
 * olduğu bilgisi. UI checkbox listesi bunun üzerinden çizilir.
 *
 * Ownership: bu partnership bu kurumun PROVIDER'ı olmalı. Receiver ise 403.
 */
async function getScope(companyId, partnershipId) {
  const p = await CompanyPartnershipModel.findById(partnershipId);
  if (!p) throw new Error('İş ortaklığı bulunamadı');
  if (p.provider_company_id !== companyId) {
    throw new Error('Bu ortaklığın filo scope\'unu sadece provider kurum yönetebilir');
  }
  if (p.terminated_at) throw new Error('Feshedilmiş ortaklığın scope\'u değiştirilemez');

  // Provider'ın aktif filosu — genel pasif olanlar da listede görünsün ki kullanıcı
  // "neden ekleyemiyorum" sorusuna cevap alsın. Ama görsel olarak işaretleriz.
  const [drivers, vehicles] = await Promise.all([
    FleetConnectionModel.findActiveDriversForCompany(companyId),
    FleetConnectionModel.findActiveVehiclesForCompany(companyId),
  ]);

  const [driverScope, vehicleScope] = await Promise.all([
    PartnershipFleetScopeModel.findIdsByPartnershipAndType(partnershipId, OWNER_TYPES.DRIVER_PROFILE),
    PartnershipFleetScopeModel.findIdsByPartnershipAndType(partnershipId, OWNER_TYPES.VEHICLE_PROFILE),
  ]);

  return {
    partnership: p,
    drivers: drivers.map(d => ({
      profile_id:   d.profile_id,
      name:         `${d.first_name} ${d.last_name}`,
      subtext:      `${d.license_class} sınıfı ehliyet · ${d.email}`,
      included:     driverScope.has(d.profile_id),
      disabled:     d.profile_status === 'inactive' || !!d.paused_at,
      disabledNote: d.profile_status === 'inactive' ? 'Sahibi pasife almış' : (d.paused_at ? 'Kurum filonda pasif' : null),
    })),
    vehicles: vehicles.map(v => ({
      profile_id:   v.profile_id,
      name:         v.plate_number,
      subtext:      `${v.brand} ${v.model} · ${v.capacity} kişi`,
      included:     vehicleScope.has(v.profile_id),
      disabled:     v.profile_status === 'inactive' || !!v.paused_at,
      disabledNote: v.profile_status === 'inactive' ? 'Sahibi pasife almış' : (v.paused_at ? 'Kurum filonda pasif' : null),
    })),
    counts: {
      driversIncluded:  driverScope.size,
      vehiclesIncluded: vehicleScope.size,
      driversTotal:     drivers.length,
      vehiclesTotal:    vehicles.length,
    },
  };
}

/**
 * Ortaklığın scope'unu güncelle. driverIds ve vehicleIds, provider'ın kendi
 * aktif filosundan olmalı — dışarıdan gelen id spam'ini validate ederiz.
 */
async function updateScope(companyId, partnershipId, driverIds, vehicleIds, userId) {
  const p = await CompanyPartnershipModel.findById(partnershipId);
  if (!p) throw new Error('İş ortaklığı bulunamadı');
  if (p.provider_company_id !== companyId) {
    throw new Error('Bu ortaklığın filo scope\'unu sadece provider kurum yönetebilir');
  }
  if (p.terminated_at) throw new Error('Feshedilmiş ortaklığın scope\'u değiştirilemez');

  // Girdi normalizasyonu — string'den int'e, tekilleştir, NaN'ları at.
  const normIds = (arr) => Array.from(new Set(
    (arr || []).map(x => parseInt(x, 10)).filter(x => Number.isInteger(x) && x > 0)
  ));
  const dIds = normIds(driverIds);
  const vIds = normIds(vehicleIds);

  // Validation: bu id'ler gerçekten provider'ın aktif filosunda mı?
  const [drivers, vehicles] = await Promise.all([
    FleetConnectionModel.findActiveDriversForCompany(companyId),
    FleetConnectionModel.findActiveVehiclesForCompany(companyId),
  ]);
  const validDriverIds  = new Set(drivers.map(d => d.profile_id));
  const validVehicleIds = new Set(vehicles.map(v => v.profile_id));

  const cleanDriverIds  = dIds.filter(id => validDriverIds.has(id));
  const cleanVehicleIds = vIds.filter(id => validVehicleIds.has(id));

  await PartnershipFleetScopeModel.setForPartnership(
    partnershipId, cleanDriverIds, cleanVehicleIds, userId
  );

  return {
    driversSaved:  cleanDriverIds.length,
    vehiclesSaved: cleanVehicleIds.length,
    driversSkipped:  dIds.length - cleanDriverIds.length,
    vehiclesSkipped: vIds.length - cleanVehicleIds.length,
  };
}

/**
 * Partnership detay sayfasındaki özet kart için — sadece sayılar.
 */
async function getCounts(partnershipId) {
  const [driverScope, vehicleScope] = await Promise.all([
    PartnershipFleetScopeModel.findIdsByPartnershipAndType(partnershipId, OWNER_TYPES.DRIVER_PROFILE),
    PartnershipFleetScopeModel.findIdsByPartnershipAndType(partnershipId, OWNER_TYPES.VEHICLE_PROFILE),
  ]);
  return {
    driversIncluded:  driverScope.size,
    vehiclesIncluded: vehicleScope.size,
  };
}

module.exports = { getScope, updateScope, getCounts };
