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

async function findByPartnership(partnershipId) {
  const [rows] = await db.query(
    `SELECT * FROM contract_acceptances
      WHERE partnership_id = ? AND deleted_at IS NULL
      ORDER BY accepted_at ASC
      LIMIT 1`,
    [partnershipId]
  );
  return rows[0] || null;
}

module.exports = { findByUser, findByFleetConnection, findByPartnership };
