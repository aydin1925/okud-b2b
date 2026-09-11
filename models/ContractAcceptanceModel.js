const db = require('../config/db');

async function findByUser(userId) {
  const [rows] = await db.query(
    `SELECT * FROM contract_acceptances
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY accepted_at DESC`,
    [userId]
  );
  return rows;
}

async function findByFleetConnection(fleetConnectionId) {
  const [rows] = await db.query(
    `SELECT * FROM contract_acceptances
      WHERE fleet_connection_id = ? AND deleted_at IS NULL
      ORDER BY contract_type ASC`,
    [fleetConnectionId]
  );
  return rows;
}

// partnership_id ile snapshot + kabul eden kullanıcının tam adı.
// Kullanıcı silinmiş olsa bile snapshot'ı gösterebilelim diye LEFT JOIN.
async function findByPartnership(partnershipId) {
  const [rows] = await db.query(
    `SELECT ca.*,
            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS accepted_by_name
       FROM contract_acceptances ca
       LEFT JOIN users u ON u.id = ca.user_id
      WHERE ca.partnership_id = ? AND ca.deleted_at IS NULL
      ORDER BY ca.accepted_at ASC
      LIMIT 1`,
    [partnershipId]
  );
  return rows[0] || null;
}

module.exports = { findByUser, findByFleetConnection, findByPartnership };
