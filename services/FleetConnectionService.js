const ConnectionRequestModel = require('../models/ConnectionRequestModel');
const FleetConnectionModel = require('../models/FleetConnectionModel');
const CompanyModel = require('../models/CompanyModel');
const DriverProfileModel = require('../models/DriverProfileModel');
const VehicleProfileModel = require('../models/VehicleProfileModel');
const ContractTemplateService = require('./ContractTemplateService');
const {
  TARGET_TYPES,
  CONTRACT_PAIR_BY_TARGET,
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
async function redeem({ code, userId, kvkkConsent, contractConsent, vehicleId, ipAddress }) {
  if (!kvkkConsent || !contractConsent) {
    throw new Error('İlerlemek için hem KVKK aydınlatma metnini hem sözleşmeyi onaylamalısın');
  }

  const request = await ConnectionRequestModel.findActiveByCode(normalizeCode(code));
  if (!request) throw new Error('Kod geçersiz veya süresi dolmuş');

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
  return { company_id: request.company_id };
}

module.exports = { getRedeemPreview, redeem, rejectByUser };
