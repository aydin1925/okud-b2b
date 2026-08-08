const db = require('../config/db');

async function create({
  vehicle_profile_id, requested_by_user_id,
  requested_plate_number, requested_brand, requested_model,
  requested_year, requested_vehicle_type, requested_capacity,
}) {
  const [result] = await db.query(
    `INSERT INTO vehicle_profile_update_requests
       (vehicle_profile_id, requested_by_user_id,
        requested_plate_number, requested_brand, requested_model,
        requested_year, requested_vehicle_type, requested_capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vehicle_profile_id, requested_by_user_id,
      requested_plate_number || null,
      requested_brand || null,
      requested_model || null,
      requested_year || null,
      requested_vehicle_type || null,
      requested_capacity || null,
    ]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM vehicle_profile_update_requests WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findPendingByProfile(vehicleProfileId) {
  const [rows] = await db.query(
    `SELECT * FROM vehicle_profile_update_requests
      WHERE vehicle_profile_id = ? AND status = 'pending' AND deleted_at IS NULL
      LIMIT 1`,
    [vehicleProfileId]
  );
  return rows[0] || null;
}

async function findAllPendingDetailed() {
  const [rows] = await db.query(
    `SELECT
        r.*,
        vp.plate_number  AS current_plate_number,
        vp.brand         AS current_brand,
        vp.model         AS current_model,
        vp.year          AS current_year,
        vp.vehicle_type  AS current_vehicle_type,
        vp.capacity      AS current_capacity,
        u.first_name, u.last_name, u.email
      FROM vehicle_profile_update_requests r
      INNER JOIN vehicle_profiles vp ON vp.id = r.vehicle_profile_id
      INNER JOIN users u ON u.id = r.requested_by_user_id
      WHERE r.status = 'pending' AND r.deleted_at IS NULL
      ORDER BY r.created_at ASC`
  );
  return rows;
}

async function approve(id, reviewerUserId, note) {
  const [result] = await db.query(
    `UPDATE vehicle_profile_update_requests
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
    `UPDATE vehicle_profile_update_requests
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
    `UPDATE vehicle_profile_update_requests
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
