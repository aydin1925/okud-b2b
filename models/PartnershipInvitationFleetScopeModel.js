const db = require('../config/db');

/**
 * PartnershipInvitationFleetScopeModel — davet-zamanı filo scope satırları.
 * Kabul anında partnership_fleet_scopes'a kopyalanır ve davet consume olur.
 */

async function findByInvitation(invitationId) {
  const [rows] = await db.query(
    `SELECT target_type, target_id
       FROM partnership_invitation_fleet_scopes
      WHERE invitation_id = ?`,
    [invitationId]
  );
  return rows;
}

async function findIdsByInvitationAndType(invitationId, targetType) {
  const [rows] = await db.query(
    `SELECT target_id
       FROM partnership_invitation_fleet_scopes
      WHERE invitation_id = ? AND target_type = ?`,
    [invitationId, targetType]
  );
  return new Set(rows.map(r => r.target_id));
}

/**
 * Bir davet için scope'u topluca yaz — kullanılırsa çağıran fonksiyon
 * kendi transaction'ında çağırır (davet insert ile aynı transaction).
 * conn opsiyonel — verilmezse global db kullanılır.
 */
async function setForInvitation(invitationId, driverIds, vehicleIds, userId, conn) {
  const executor = conn || db;

  await executor.query(
    `DELETE FROM partnership_invitation_fleet_scopes WHERE invitation_id = ?`,
    [invitationId]
  );

  const rows = [];
  for (const id of driverIds)  rows.push([invitationId, 'driver_profile',  id, userId || null]);
  for (const id of vehicleIds) rows.push([invitationId, 'vehicle_profile', id, userId || null]);

  if (rows.length > 0) {
    await executor.query(
      `INSERT INTO partnership_invitation_fleet_scopes
         (invitation_id, target_type, target_id, added_by_user_id)
       VALUES ?`,
      [rows]
    );
  }
}

module.exports = {
  findByInvitation,
  findIdsByInvitationAndType,
  setForInvitation,
};
