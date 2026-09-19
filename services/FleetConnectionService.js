const ConnectionRequestModel = require('../models/ConnectionRequestModel');
const FleetConnectionModel = require('../models/FleetConnectionModel');
const CompanyModel = require('../models/CompanyModel');
const DriverProfileModel = require('../models/DriverProfileModel');
const VehicleProfileModel = require('../models/VehicleProfileModel');
const ContractTemplateService = require('./ContractTemplateService');
const AuditService = require('./AuditService');
const {
  TARGET_TYPES,
  DRIVER_AND_VEHICLE,
  CONTRACT_PAIR_BY_TARGET,
  AUDIT_ACTIONS,
} = require('../utils/constants');

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

// Kod doğrulandıktan sonra kabul ekranında gösterilecek bilgileri hazırlar.
// KVKK + Sözleşme metinleri de burada preview'a dahil edilir.
async function getRedeemPreview(code, userId) {
  const request = await ConnectionRequestModel.findActiveByCode(normalizeCode(code));
  if (!request) throw new Error('Kod geçersiz veya süresi dolmuş');

  const company = await CompanyModel.findById(request.company_id);
  if (!company) throw new Error('Kodun ait olduğu kurum bulunamadı');

  // Kombine davet: hem şoför hem araç sözleşme çiftlerini + profil/araç listesini hazırla
  if (request.target_type === DRIVER_AND_VEHICLE) {
    const dPair = CONTRACT_PAIR_BY_TARGET[TARGET_TYPES.DRIVER_PROFILE];
    const vPair = CONTRACT_PAIR_BY_TARGET[TARGET_TYPES.VEHICLE_PROFILE];

    const vehicles = await VehicleProfileModel.findByOwnerUserId(userId);

    return {
      request,
      company,
      target_type: DRIVER_AND_VEHICLE,
      driverProfile: await DriverProfileModel.findByUserId(userId),
      vehicles: vehicles.filter((v) => v.status === 'active'),
      driver: {
        kvkk:     await ContractTemplateService.getEffective(request.company_id, dPair.kvkk),
        contract: await ContractTemplateService.getEffective(request.company_id, dPair.contract),
      },
      vehicle: {
        kvkk:     await ContractTemplateService.getEffective(request.company_id, vPair.kvkk),
        contract: await ContractTemplateService.getEffective(request.company_id, vPair.contract),
      },
    };
  }

  const pair = CONTRACT_PAIR_BY_TARGET[request.target_type];
  const kvkk = await ContractTemplateService.getEffective(request.company_id, pair.kvkk);
  const contract = await ContractTemplateService.getEffective(request.company_id, pair.contract);

  const preview = {
    request,
    company,
    target_type: request.target_type,
    kvkk,
    contract,
  };

  if (request.target_type === TARGET_TYPES.DRIVER_PROFILE) {
    preview.driverProfile = await DriverProfileModel.findByUserId(userId);
  } else if (request.target_type === TARGET_TYPES.VEHICLE_PROFILE) {
    const vehicles = await VehicleProfileModel.findByOwnerUserId(userId);
    preview.vehicles = vehicles.filter((v) => v.status === 'active');
  }

  return preview;
}

// Kodu kabul eder: KVKK + Sözleşme onayı, profil kontrolleri, bağlantı kurma, snapshot yaz.
// Onay doğrulaması tür-duyarlı: kombine davette şoför + araç için ayrı onay.
async function redeem({ code, userId, kvkkConsent, contractConsent, driverConsent, vehicleConsent, vehicleId, ipAddress }) {
  const request = await ConnectionRequestModel.findActiveByCode(normalizeCode(code));
  if (!request) throw new Error('Kod geçersiz veya süresi dolmuş');

  if (request.target_type === DRIVER_AND_VEHICLE) {
    if (!driverConsent || !vehicleConsent) {
      throw new Error('İlerlemek için hem şoför hem araç sözleşme ve KVKK metinlerini onaylamalısın');
    }
    return redeemDriverAndVehicle(request, userId, vehicleId, ipAddress);
  }

  if (!kvkkConsent || !contractConsent) {
    throw new Error('İlerlemek için hem KVKK aydınlatma metnini hem sözleşmeyi onaylamalısın');
  }
  if (request.target_type === TARGET_TYPES.DRIVER_PROFILE) {
    return redeemDriver(request, userId, ipAddress);
  }
  if (request.target_type === TARGET_TYPES.VEHICLE_PROFILE) {
    return redeemVehicle(request, userId, vehicleId, ipAddress);
  }
  throw new Error('Geçersiz kod türü');
}

// Davetli reddetme akışı — bağlantı ve kabul kaydı YOK, sadece OTP status='rejected'.
async function rejectByUser({ code, userId }) {
  const request = await ConnectionRequestModel.findActiveByCode(normalizeCode(code));
  if (!request) throw new Error('Kod geçersiz veya süresi dolmuş');

  const affected = await ConnectionRequestModel.rejectByUser(request.id, userId);
  if (!affected) throw new Error('Kod artık geçerli değil');

  return { company_id: request.company_id };
}

// ─────────── iç yardımcılar ───────────

function buildAcceptances(kvkkTemplate, contractTemplate, kvkkType, contractType) {
  return [
    {
      contract_type: kvkkType,
      template_id: kvkkTemplate.source === 'custom' ? kvkkTemplate.id || null : null,
      title_snapshot: kvkkTemplate.title,
      content_snapshot: kvkkTemplate.content,
    },
    {
      contract_type: contractType,
      template_id: contractTemplate.source === 'custom' ? contractTemplate.id || null : null,
      title_snapshot: contractTemplate.title,
      content_snapshot: contractTemplate.content,
    },
  ];
}

async function redeemDriver(request, userId, ipAddress) {
  const profile = await DriverProfileModel.findByUserId(userId);
  if (!profile) throw new Error('Bu kodu kabul etmek için önce şoför profili oluşturmalısın');
  if (profile.status !== 'active') {
    throw new Error('Şoför profilin aktif değil; belgelerin onaylanmadan filoya katılamazsın');
  }

  const already = await FleetConnectionModel.existsActive(
    request.company_id, TARGET_TYPES.DRIVER_PROFILE, profile.id
  );
  if (already) throw new Error('Bu kurumun filosunda zaten kayıtlısın');

  const pair = CONTRACT_PAIR_BY_TARGET[request.target_type];
  const kvkk = await ContractTemplateService.getEffective(request.company_id, pair.kvkk);
  const contract = await ContractTemplateService.getEffective(request.company_id, pair.contract);
  const acceptances = buildAcceptances(kvkk, contract, pair.kvkk, pair.contract);

  await FleetConnectionModel.createFromRequestWithAcceptances({
    request, target_id: profile.id, userId, acceptances, ipAddress,
  });

  AuditService.log({
    actorUserId: userId,
    companyId: request.company_id,
    action: AUDIT_ACTIONS.FLEET_JOIN,
    entityType: TARGET_TYPES.DRIVER_PROFILE,
    entityId: profile.id,
    metadata: { via: 'redeem', requestId: request.id },
    ipAddress,
  });
  return { company_id: request.company_id };
}

async function redeemVehicle(request, userId, vehicleId, ipAddress) {
  const vid = parseInt(vehicleId, 10);
  if (!vid) throw new Error('Bağlanacak bir araç seçmelisin');

  const vehicle = await VehicleProfileModel.findById(vid);
  if (!vehicle) throw new Error('Araç bulunamadı');
  if (vehicle.owner_user_id !== userId) throw new Error('Bu araç sana ait değil');
  if (vehicle.status !== 'active') {
    throw new Error('Aracın aktif değil; belgeleri onaylanmadan filoya katılamaz');
  }

  const already = await FleetConnectionModel.existsActive(
    request.company_id, TARGET_TYPES.VEHICLE_PROFILE, vehicle.id
  );
  if (already) throw new Error('Bu araç zaten bu kurumun filosunda');

  const pair = CONTRACT_PAIR_BY_TARGET[request.target_type];
  const kvkk = await ContractTemplateService.getEffective(request.company_id, pair.kvkk);
  const contract = await ContractTemplateService.getEffective(request.company_id, pair.contract);
  const acceptances = buildAcceptances(kvkk, contract, pair.kvkk, pair.contract);

  await FleetConnectionModel.createFromRequestWithAcceptances({
    request, target_id: vehicle.id, userId, acceptances, ipAddress,
  });

  AuditService.log({
    actorUserId: userId,
    companyId: request.company_id,
    action: AUDIT_ACTIONS.FLEET_JOIN,
    entityType: TARGET_TYPES.VEHICLE_PROFILE,
    entityId: vehicle.id,
    metadata: { via: 'redeem', requestId: request.id },
    ipAddress,
  });
  return { company_id: request.company_id };
}

// Kombine: şoför + araç birlikte. Tek transaction'da iki bağlantı + 4 kabul kaydı.
async function redeemDriverAndVehicle(request, userId, vehicleId, ipAddress) {
  // Şoför profili
  const profile = await DriverProfileModel.findByUserId(userId);
  if (!profile) throw new Error('Bu kodu kabul etmek için önce şoför profili oluşturmalısın');
  if (profile.status !== 'active') {
    throw new Error('Şoför profilin aktif değil; belgelerin onaylanmadan filoya katılamazsın');
  }

  // Araç
  const vid = parseInt(vehicleId, 10);
  if (!vid) throw new Error('Bağlanacak bir araç seçmelisin');
  const vehicle = await VehicleProfileModel.findById(vid);
  if (!vehicle) throw new Error('Araç bulunamadı');
  if (vehicle.owner_user_id !== userId) throw new Error('Bu araç sana ait değil');
  if (vehicle.status !== 'active') {
    throw new Error('Aracın aktif değil; belgeleri onaylanmadan filoya katılamaz');
  }

  // Zaten filoda mı?
  const driverIn = await FleetConnectionModel.existsActive(
    request.company_id, TARGET_TYPES.DRIVER_PROFILE, profile.id
  );
  if (driverIn) throw new Error('Bu kurumun filosunda şoför olarak zaten kayıtlısın');
  const vehicleIn = await FleetConnectionModel.existsActive(
    request.company_id, TARGET_TYPES.VEHICLE_PROFILE, vehicle.id
  );
  if (vehicleIn) throw new Error('Bu araç zaten bu kurumun filosunda');

  // Her iki sözleşme çiftini çöz
  const dPair = CONTRACT_PAIR_BY_TARGET[TARGET_TYPES.DRIVER_PROFILE];
  const vPair = CONTRACT_PAIR_BY_TARGET[TARGET_TYPES.VEHICLE_PROFILE];

  const dKvkk     = await ContractTemplateService.getEffective(request.company_id, dPair.kvkk);
  const dContract = await ContractTemplateService.getEffective(request.company_id, dPair.contract);
  const vKvkk     = await ContractTemplateService.getEffective(request.company_id, vPair.kvkk);
  const vContract = await ContractTemplateService.getEffective(request.company_id, vPair.contract);

  // 4 kabul kaydı — her biri 'driver' veya 'vehicle' bağlantısına etiketli
  const acceptances = [
    ...tagAcceptances(dKvkk, dContract, dPair, 'driver'),
    ...tagAcceptances(vKvkk, vContract, vPair, 'vehicle'),
  ];

  await FleetConnectionModel.createDriverAndVehicleFromRequest({
    request,
    driverProfileId: profile.id,
    vehicleId: vehicle.id,
    userId,
    acceptances,
    ipAddress,
  });

  // Kombine davet iki ayrı bağlantı açar → iki ayrı fleet.join satırı.
  AuditService.log({
    actorUserId: userId,
    companyId: request.company_id,
    action: AUDIT_ACTIONS.FLEET_JOIN,
    entityType: TARGET_TYPES.DRIVER_PROFILE,
    entityId: profile.id,
    metadata: { via: 'redeem_combined', requestId: request.id },
    ipAddress,
  });
  AuditService.log({
    actorUserId: userId,
    companyId: request.company_id,
    action: AUDIT_ACTIONS.FLEET_JOIN,
    entityType: TARGET_TYPES.VEHICLE_PROFILE,
    entityId: vehicle.id,
    metadata: { via: 'redeem_combined', requestId: request.id },
    ipAddress,
  });
  return { company_id: request.company_id };
}

// Bir sözleşme çifti için 2 kabul kaydı üretir, hangi bağlantıya ait olduğunu etiketler.
function tagAcceptances(kvkkTemplate, contractTemplate, pair, tag) {
  return [
    {
      fleet_connection_id: tag,
      contract_type: pair.kvkk,
      template_id: kvkkTemplate.source === 'custom' ? kvkkTemplate.id || null : null,
      title_snapshot: kvkkTemplate.title,
      content_snapshot: kvkkTemplate.content,
    },
    {
      fleet_connection_id: tag,
      contract_type: pair.contract,
      template_id: contractTemplate.source === 'custom' ? contractTemplate.id || null : null,
      title_snapshot: contractTemplate.title,
      content_snapshot: contractTemplate.content,
    },
  ];
}

module.exports = { getRedeemPreview, redeem, rejectByUser };
