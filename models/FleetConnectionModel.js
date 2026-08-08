const db = require('../config/db');

// Bu kurum, bu hedefe (şoför/araç) hâlâ aktif bağlı mı?
async function existsActive(companyId, targetType, targetId) {
  const [rows] = await db.query(
    `SELECT id FROM fleet_connections
      WHERE company_id = ? AND target_type = ? AND target_id = ?
        AND disconnected_at IS NULL
      LIMIT 1`,
    [companyId, targetType, targetId]
  );
  return rows.length > 0;
}

async function create({ company_id, target_type, target_id, connection_request_id }) {
  const [result] = await db.query(
    `INSERT INTO fleet_connections
       (company_id, target_type, target_id, connection_request_id)
     VALUES (?, ?, ?, ?)`,
    [company_id, target_type, target_id, connection_request_id || null]
  );
  return result.insertId;
}

// Bir kurumun aktif filo bağlantıları (17b/dashboard için).
async function findActiveByCompany(companyId) {
  const [rows] = await db.query(
    `SELECT * FROM fleet_connections
      WHERE company_id = ? AND disconnected_at IS NULL
      ORDER BY connected_at DESC`,
    [companyId]
  );
  return rows;
}

// OTP kodunu tüketip filo bağlantısını + iki (KVKK+sözleşme) kabul kaydını
// tek transaction'da kurar. 4 yazma işlemi atomik: birisi patlarsa hepsi rollback.
async function createFromRequestWithAcceptances({ request, target_id, userId, acceptances, ipAddress }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Kodu consumed yap (yarış korumalı WHERE)
    const [upd] = await conn.query(
      `UPDATE connection_requests
          SET status = 'consumed', consumed_by = ?, consumed_at = NOW()
        WHERE id = ? AND status = 'pending' AND expires_at > NOW() AND deleted_at IS NULL`,
      [userId, request.id]
    );
    if (upd.affectedRows === 0) {
      throw new Error('Kod artık geçerli değil (kullanılmış veya süresi dolmuş olabilir)');
    }

    // 2) fleet_connections insert
    const [ins] = await conn.query(
      `INSERT INTO fleet_connections
         (company_id, target_type, target_id, connection_request_id)
       VALUES (?, ?, ?, ?)`,
      [request.company_id, request.target_type, target_id, request.id]
    );
    const fleetConnectionId = ins.insertId;

    // 3-4) contract_acceptances insert (her snapshot için ayrı satır)
    for (const acc of acceptances) {
      await conn.query(
        `INSERT INTO contract_acceptances
           (user_id, company_id, fleet_connection_id, contract_type,
            template_id, title_snapshot, content_snapshot, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          request.company_id,
          fleetConnectionId,
          acc.contract_type,
          acc.template_id || null,
          acc.title_snapshot,
          acc.content_snapshot,
          ipAddress || null,
        ]
      );
    }

    await conn.commit();
    return fleetConnectionId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Kurumun aktif filodaki şoförleri (JOIN driver_profiles + users)
async function findActiveDriversForCompany(companyId) {
  const [rows] = await db.query(
    `SELECT
        fc.id             AS connection_id,
        fc.connected_at,
        dp.id             AS profile_id,
        dp.national_id,
        dp.phone,
        dp.license_class,
        dp.status         AS profile_status,
        u.id              AS user_id,
        u.first_name,
        u.last_name,
        u.email
       FROM fleet_connections fc
       INNER JOIN driver_profiles dp ON dp.id = fc.target_id
       INNER JOIN users           u  ON u.id  = dp.user_id
      WHERE fc.company_id = ?
        AND fc.target_type = 'driver_profile'
        AND fc.disconnected_at IS NULL
        AND dp.deleted_at IS NULL
        AND u.deleted_at  IS NULL
      ORDER BY fc.connected_at DESC`,
    [companyId]
  );
  return rows;
}

// Kurumun aktif filodaki araçları (JOIN vehicle_profiles + users)
async function findActiveVehiclesForCompany(companyId) {
  const [rows] = await db.query(
    `SELECT
        fc.id              AS connection_id,
        fc.connected_at,
        vp.id              AS profile_id,
        vp.plate_number,
        vp.brand,
        vp.model,
        vp.year,
        vp.vehicle_type,
        vp.capacity,
        vp.status          AS profile_status,
        u.id               AS owner_user_id,
        u.first_name       AS owner_first_name,
        u.last_name        AS owner_last_name,
        u.email            AS owner_email
       FROM fleet_connections fc
       INNER JOIN vehicle_profiles vp ON vp.id = fc.target_id
       INNER JOIN users            u  ON u.id  = vp.owner_user_id
      WHERE fc.company_id = ?
        AND fc.target_type = 'vehicle_profile'
        AND fc.disconnected_at IS NULL
        AND vp.deleted_at IS NULL
        AND u.deleted_at  IS NULL
      ORDER BY fc.connected_at DESC`,
    [companyId]
  );
  return rows;
}

// Bir şoför/aracın hâlâ aktif bağlı olduğu tüm kurumları döndürür.
// Kurum bildirimi zincirinde: belge dolacaksa hangi kurumların uyarılması gerektiğini bulur.
async function findActiveCompaniesByOwner(ownerType, ownerId) {
  const [rows] = await db.query(
    `SELECT DISTINCT c.id, c.name, c.company_type
       FROM fleet_connections fc
       INNER JOIN companies c ON c.id = fc.company_id
      WHERE fc.target_type = ?
        AND fc.target_id = ?
        AND fc.disconnected_at IS NULL
        AND c.deleted_at IS NULL`,
    [ownerType, ownerId]
  );
  return rows;
}

// Detay sayfası ownership check: bu hedef bu kurumun aktif filosunda mı?
async function findActiveByTarget(companyId, targetType, targetId) {
  const [rows] = await db.query(
    `SELECT * FROM fleet_connections
      WHERE company_id = ? AND target_type = ? AND target_id = ?
        AND disconnected_at IS NULL
      LIMIT 1`,
    [companyId, targetType, targetId]
  );
  return rows[0] || null;
}

module.exports = {
  existsActive,
  create,
  findActiveByCompany,
  createFromRequestWithAcceptances,
  findActiveDriversForCompany,
  findActiveVehiclesForCompany,
  findActiveCompaniesByOwner,
  findActiveByTarget,
};
