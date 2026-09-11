const db = require('../config/db');

/**
 * HostessProfileModel — saf SQL katmanı, iş kuralı içermez.
 * Hostes = araç sahibinin yönettiği operasyonel personel.
 * Bir hostes zorunlu olarak bir araca bağlıdır.
 */

async function create({
  managed_by_user_id, vehicle_id, first_name, last_name,
  national_id, phone, birth_date, notes,
}) {
  const [result] = await db.query(
    `INSERT INTO hostess_profiles
       (managed_by_user_id, vehicle_id, first_name, last_name,
        national_id, phone, birth_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [managed_by_user_id, vehicle_id, first_name, last_name,
     national_id, phone || null, birth_date, notes || null]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT * FROM hostess_profiles WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// Bir araç sahibinin (managed_by) yönettiği hostesler + hangi araca bağlı olduğu bilgisi.
// LEFT JOIN: boşta hostesler (vehicle_id NULL veya bağlı araç silinmiş) de listelenir —
// plate_number / brand / model NULL döner ve UI "boşta" olarak işaretler.
async function findByManagedUser(userId) {
  const [rows] = await db.query(
    `SELECT h.*,
            v.plate_number,
            v.brand,
            v.model
       FROM hostess_profiles h
       LEFT JOIN vehicle_profiles v
              ON v.id = h.vehicle_id AND v.deleted_at IS NULL
      WHERE h.managed_by_user_id = ?
        AND h.deleted_at IS NULL
      ORDER BY h.created_at DESC`,
    [userId]
  );
  return rows;
}

// Bir araca bağlı aktif hostes (varsa) — filo hesabında araç sağlığına dahil
async function findActiveByVehicleId(vehicleId) {
  const [rows] = await db.query(
    `SELECT * FROM hostess_profiles
      WHERE vehicle_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [vehicleId]
  );
  return rows[0] || null;
}

async function findByNationalId(national_id) {
  const [rows] = await db.query(
    `SELECT * FROM hostess_profiles
      WHERE national_id = ? AND deleted_at IS NULL LIMIT 1`,
    [national_id]
  );
  return rows[0] || null;
}

// Hassas olmayan alanların güncellemesi (phone, notes)
async function updateSafeFields(id, { phone, notes }) {
  const [result] = await db.query(
    `UPDATE hostess_profiles
        SET phone = ?, notes = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [phone || null, notes || null, id]
  );
  return result.affectedRows;
}

// Onboarding gate — belge durumu tarandıktan sonra status güncellenir
async function updateStatus(id, status) {
  const [result] = await db.query(
    `UPDATE hostess_profiles SET status = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [status, id]
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    `UPDATE hostess_profiles SET deleted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows;
}

// Bir kullanıcının yönettiği "boşta" (vehicle_id NULL) hostesler.
// Araç silindikten sonra kalan hostesler burada listelenir.
async function findUnassignedByOwner(userId) {
  const [rows] = await db.query(
    `SELECT * FROM hostess_profiles
      WHERE managed_by_user_id = ?
        AND vehicle_id IS NULL
        AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

// Boşta hostesi bir araca atar — yarış korumalı (sadece hala boştaysa).
async function assignToVehicle(hostessId, vehicleId) {
  const [result] = await db.query(
    `UPDATE hostess_profiles SET vehicle_id = ?
      WHERE id = ? AND vehicle_id IS NULL AND deleted_at IS NULL`,
    [vehicleId, hostessId]
  );
  return result.affectedRows;
}

module.exports = {
  create,
  findById,
  findByManagedUser,
  findActiveByVehicleId,
  findByNationalId,
  updateSafeFields,
  updateStatus,
  softDelete,
  findUnassignedByOwner,
  assignToVehicle,
};
