const db = require('../config/db');

async function create({ driver_profile_id, requested_by_user_id, requested_national_id, requested_birth_date, requested_license_class }) {
  const [result] = await db.query(
    `INSERT INTO driver_profile_update_requests
       (driver_profile_id, requested_by_user_id,
        requested_national_id, requested_birth_date, requested_license_class)
     VALUES (?, ?, ?, ?, ?)`,
    [
      driver_profile_id,
      requested_by_user_id,
      requested_national_id || null,
      requested_birth_date  || null,
      requested_license_class || null,
    ]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM driver_profile_update_requests WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findPendingByProfile(driverProfileId) {
  const [rows] = await db.query(
    `SELECT * FROM driver_profile_update_requests
      WHERE driver_profile_id = ? AND status = 'pending' AND deleted_at IS NULL
      LIMIT 1`,
    [driverProfileId]
  );
  return rows[0] || null;
}

// Admin panelinde tüm bekleyenler — profil + kullanıcı JOIN'li
async function findAllPendingDetailed() {
  const [rows] = await db.query(
    `SELECT
        r.*,
        dp.national_id  AS current_national_id,
        dp.birth_date   AS current_birth_date,
        dp.license_class AS current_license_class,
        u.first_name, u.last_name, u.email
      FROM driver_profile_update_requests r
      INNER JOIN driver_profiles dp ON dp.id = r.driver_profile_id
      INNER JOIN users u ON u.id = r.requested_by_user_id
      WHERE r.status = 'pending' AND r.deleted_at IS NULL
      ORDER BY r.created_at ASC`
  );
  return rows;
}

async function approve(id, reviewerUserId, note) {
  const [result] = await db.query(
    `UPDATE driver_profile_update_requests
        SET status = 'approved',
            reviewed_by_user_id = ?,
            reviewed_at = NOW(),
            review_note = ?
      WHERE id = ? AND status = 'pending' AND deleted_at IS NULL`,
    [reviewerUserId, note || null, id]
  );
  return result.affectedRows;
}

async function reject(id, reviewerUserId, reason) {
  const [result] = await db.query(
    `UPDATE driver_profile_update_requests
        SET status = 'rejected',
            reviewed_by_user_id = ?,
            reviewed_at = NOW(),
            review_note = ?
      WHERE id = ? AND status = 'pending' AND deleted_at IS NULL`,
    [reviewerUserId, reason, id]
  );
  return result.affectedRows;
}

async function cancelByUser(id, userId) {
  const [result] = await db.query(
    `UPDATE driver_profile_update_requests
        SET status = 'cancelled'
      WHERE id = ? AND requested_by_user_id = ? AND status = 'pending' AND deleted_at IS NULL`,
    [id, userId]
  );
  return result.affectedRows;
}

module.exports = {
  create, findById, findPendingByProfile, findAllPendingDetailed,
  approve, reject, cancelByUser,
};
