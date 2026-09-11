const HostessProfileModel = require('../models/HostessProfileModel');
const VehicleProfileModel = require('../models/VehicleProfileModel');
const DocumentModel = require('../models/DocumentModel');
const {
  HOSTESS_DOCUMENT_TYPES,
  OWNER_TYPES,
} = require('../utils/constants');

const NATIONAL_ID_REGEX = /^\d{11}$/;
const PHONE_REGEX = /^\+?[\d\s]{10,20}$/;

/**
 * Yeni hostes oluştur:
 *  - Sadece araç sahibi kendi aracına hostes ekleyebilir (ownership)
 *  - Bir araca zaten aktif hostes varsa reddet
 *  - TC / telefon / yaş validasyonları
 *  - Aynı TC ile başka hostes profili varsa reddet
 */
async function create({ vehicle_id, first_name, last_name, national_id, phone, birth_date, notes }, userId) {
  if (!vehicle_id || !first_name || !last_name || !national_id || !birth_date) {
    throw new Error('Araç, ad, soyad, TC ve doğum tarihi zorunludur');
  }
  if (!NATIONAL_ID_REGEX.test(national_id)) {
    throw new Error('TC kimlik numarası 11 haneli olmalı');
  }
  if (phone && !PHONE_REGEX.test(phone)) {
    throw new Error('Geçersiz telefon formatı');
  }

  const birth = new Date(birth_date);
  const now = new Date();
  const age = now.getFullYear() - birth.getFullYear()
    - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  if (age < 18) {
    throw new Error('Hostes en az 18 yaşında olmalı');
  }

  // Ownership — bu araç bu kullanıcının mı?
  const vehicle = await VehicleProfileModel.findById(vehicle_id);
  if (!vehicle) {
    throw new Error('Araç bulunamadı');
  }
  if (vehicle.owner_user_id !== userId) {
    throw new Error('Bu araca hostes ekleme yetkin yok');
  }

  // Bu araca zaten aktif hostes var mı?
  const existingActive = await HostessProfileModel.findActiveByVehicleId(vehicle_id);
  if (existingActive) {
    throw new Error('Bu araca zaten bir hostes atanmış — önce mevcut hostesi kaldır');
  }

  // TC tekilliği — hem şoför hem hostes cross-check gerekmez, sadece hostess tablosunda
  const existingByTc = await HostessProfileModel.findByNationalId(national_id);
  if (existingByTc) {
    throw new Error('Bu TC ile kayıtlı başka bir hostes profili var');
  }

  const hostessId = await HostessProfileModel.create({
    managed_by_user_id: userId,
    vehicle_id,
    first_name,
    last_name,
    national_id,
    phone,
    birth_date,
    notes,
  });

  return { id: hostessId };
}

async function listForUser(userId) {
  return HostessProfileModel.findByManagedUser(userId);
}

/**
 * Ownership check + return — sadece yöneten kullanıcı kendi hostesini görebilir.
 */
async function getForUser(userId, hostessId) {
  const hostess = await HostessProfileModel.findById(hostessId);
  if (!hostess) throw new Error('Hostes bulunamadı');
  if (hostess.managed_by_user_id !== userId) {
    throw new Error('Bu hostesi görme yetkin yok');
  }
  return hostess;
}

/**
 * Hassas olmayan alan güncellemesi — sadece yöneten kullanıcı.
 * (TC / doğum tarihi gibi kritik alanların düzenleme akışı sonra eklenebilir;
 *  MVP için bunlar sabit.)
 */
async function updateSafeFields(userId, hostessId, { phone, notes }) {
  const hostess = await getForUser(userId, hostessId);
  if (phone && !PHONE_REGEX.test(phone)) {
    throw new Error('Geçersiz telefon formatı');
  }
  await HostessProfileModel.updateSafeFields(hostess.id, { phone, notes });
}

/**
 * Onboarding Gate — HOSTESS_DOCUMENT_TYPES üzerinde tarama.
 * Tüm gerekli belgeler verified ve geçerli ise 'active'; değilse 'pending_docs'.
 * 'inactive' manuel karardır, buradan geri döndürmeyiz.
 */
async function recomputeStatus(hostessId) {
  const hostess = await HostessProfileModel.findById(hostessId);
  if (!hostess || hostess.status === 'inactive') return;

  let allValid = true;
  const today = new Date().toISOString().slice(0, 10);

  for (const type of HOSTESS_DOCUMENT_TYPES) {
    const doc = await DocumentModel.findLatestByType(
      OWNER_TYPES.HOSTESS_PROFILE,
      hostessId,
      type
    );
    if (!doc) { allValid = false; break; }
    if (doc.verification_status !== 'verified') { allValid = false; break; }
    if (doc.expires_at && doc.expires_at < today) { allValid = false; break; }
  }

  const newStatus = allValid ? 'active' : 'pending_docs';
  if (newStatus !== hostess.status) {
    await HostessProfileModel.updateStatus(hostessId, newStatus);
  }
}

/**
 * Manuel pasife alma / aktifleştirme.
 */
async function setActive(userId, hostessId, active) {
  const hostess = await getForUser(userId, hostessId); // ownership check

  if (active === false || active === 'false') {
    if (hostess.status === 'inactive') return;
    await HostessProfileModel.updateStatus(hostess.id, 'inactive');
  } else {
    await HostessProfileModel.updateStatus(hostess.id, 'pending_docs');
    await recomputeStatus(hostess.id);
  }
}

/**
 * Hostesi filodan çıkarma — sadece yöneten kullanıcı silebilir.
 * Belge dosyaları diskte kalır.
 */
async function softDelete(userId, hostessId) {
  const hostess = await getForUser(userId, hostessId); // ownership check
  const affected = await HostessProfileModel.softDelete(hostess.id);
  if (!affected) throw new Error('Hostes zaten silinmiş');
}

/**
 * Boşta hostesleri listele — araç silindikten sonra vehicle_id NULL kalan hostesler.
 * Aracın hostes ekleme formunda "mevcut boşta hostesten seç" dropdown'unda kullanılır.
 */
async function listUnassignedForUser(userId) {
  return HostessProfileModel.findUnassignedByOwner(userId);
}

/**
 * Boşta hostesi bir araca ata — 3'lü kontrol:
 *   1) Hostes bu kullanıcının yönetiminde olmalı
 *   2) Araç bu kullanıcının sahipliğinde olmalı
 *   3) Aracın halihazırda aktif hostesi olmamalı
 * Bu kural sistem genelinde "bir araca bir hostes" tutmak için kritik.
 */
async function assignToVehicle(userId, hostessId, vehicleId) {
  const hostess = await HostessProfileModel.findById(hostessId);
  if (!hostess) throw new Error('Hostes bulunamadı');
  if (hostess.managed_by_user_id !== userId) throw new Error('Bu hostesi yönetme yetkin yok');
  if (hostess.vehicle_id) throw new Error('Bu hostes zaten bir araca bağlı');

  const vehicle = await VehicleProfileModel.findById(vehicleId);
  if (!vehicle) throw new Error('Araç bulunamadı');
  if (vehicle.owner_user_id !== userId) throw new Error('Bu araca hostes atama yetkin yok');

  const existingActive = await HostessProfileModel.findActiveByVehicleId(vehicleId);
  if (existingActive) throw new Error('Bu araca zaten bir hostes atanmış');

  const affected = await HostessProfileModel.assignToVehicle(hostessId, vehicleId);
  if (!affected) throw new Error('Atama yapılamadı (hostes bu arada başkasına atanmış olabilir)');
}

module.exports = {
  create,
  listForUser,
  getForUser,
  updateSafeFields,
  recomputeStatus,
  softDelete,
  setActive,
  listUnassignedForUser,
  assignToVehicle,
};
