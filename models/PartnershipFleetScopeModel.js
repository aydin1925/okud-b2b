const db = require('../config/db');

/**
 * PartnershipFleetScopeModel — saf SQL katmanı.
 * Semantik: satır VAR = dahil, YOK = dahil DEĞİL (inclusion listesi).
 */

// Bir ortaklığa dahil edilmiş TÜM üyeler (driver + vehicle karışık).
async function findByPartnership(partnershipId) {
  const [rows] = await db.query(
    `SELECT target_type, target_id, added_at, added_by_user_id
       FROM partnership_fleet_scopes
      WHERE partnership_id = ?`,
    [partnershipId]
  );
  return rows;
}

// Bir ortaklığa dahil edilmiş sadece belirli tip üyelerin id kümesi.
async function findIdsByPartnershipAndType(partnershipId, targetType) {
  const [rows] = await db.query(
    `SELECT target_id
       FROM partnership_fleet_scopes
      WHERE partnership_id = ? AND target_type = ?`,
    [partnershipId, targetType]
  );
  return new Set(rows.map(r => r.target_id));
}

// Tek üye dahil mi?
async function isIncluded(partnershipId, targetType, targetId) {
  const [rows] = await db.query(
    `SELECT id FROM partnership_fleet_scopes
      WHERE partnership_id = ? AND target_type = ? AND target_id = ?
      LIMIT 1`,
    [partnershipId, targetType, targetId]
  );
  return rows.length > 0;
}

/**
 * Bir ortaklığın filo scope'unu topluca yeniden yazar.
 * Transaction: mevcut hepsini sil + verilen id'leri INSERT.
 * `driverIds` ve `vehicleIds` normalize edilmiş sayı dizileri olmalı.
 */
async function setForPartnership(partnershipId, driverIds, vehicleIds, userId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM partnership_fleet_scopes WHERE partnership_id = ?`,
      [partnershipId]
    );

    const rows = [];
    for (const id of driverIds)  rows.push([partnershipId, 'driver_profile',  id, userId || null]);
    for (const id of vehicleIds) rows.push([partnershipId, 'vehicle_profile', id, userId || null]);

    if (rows.length > 0) {
      await conn.query(
        `INSERT INTO partnership_fleet_scopes
           (partnership_id, target_type, target_id, added_by_user_id)
         VALUES ?`,
        [rows]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  findByPartnership,
  findIdsByPartnershipAndType,
  isIncluded,
  setForPartnership,
};
