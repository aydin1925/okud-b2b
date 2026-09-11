const db = require('../config/db');

async function findByTaxNumber(tax_number) {
  const [rows] = await db.query(
    'SELECT * FROM companies WHERE tax_number = ? AND deleted_at IS NULL LIMIT 1',
    [tax_number]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function createWithAdmin({ name, tax_number, company_type, adminUserId, adminRoleId }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [companyResult] = await conn.query(
      `INSERT INTO companies (name, tax_number, company_type, is_active)
       VALUES (?, ?, ?, FALSE)`,
      [name, tax_number, company_type]
    );
    const companyId = companyResult.insertId;

    await conn.query(
      `INSERT INTO company_users (user_id, company_id, role_id)
       VALUES (?, ?, ?)`,
      [adminUserId, companyId, adminRoleId]
    );

    await conn.commit();
    return companyId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function findByUserId(userId) {
  const [rows] = await db.query(
    `SELECT
        c.id, c.name, c.tax_number, c.company_type, c.is_active,
        r.name AS role_name, r.display_name AS role_display_name
      FROM company_users cu
      INNER JOIN companies c ON c.id = cu.company_id
      INNER JOIN roles     r ON r.id = cu.role_id
      WHERE cu.user_id = ?
        AND cu.deleted_at IS NULL
        AND c.deleted_at  IS NULL
      ORDER BY c.name ASC`,
    [userId]
  );
  return rows;
}

/**
 * Kullanıcının FİLO ÜYESİ olarak (şoför / araç sahibi / hostes yöneticisi olarak)
 * bağlı olduğu kurumlar. company_users'ta yer almayan sıradan filo üyeleri için.
 * Her satırda role_name = null, role_display_name = target_type'a göre etiket.
 */
async function findByFleetMembership(userId) {
  const [rows] = await db.query(
    `SELECT DISTINCT
        c.id, c.name, c.tax_number, c.company_type, c.is_active,
        NULL AS role_name,
        CASE fc.target_type
          WHEN 'driver_profile'  THEN 'Şoför'
          WHEN 'vehicle_profile' THEN 'Araç Sahibi'
          WHEN 'hostess_profile' THEN 'Hostes Yöneticisi'
          ELSE 'Filo Üyesi'
        END AS role_display_name
      FROM fleet_connections fc
      INNER JOIN companies c ON c.id = fc.company_id
      LEFT JOIN driver_profiles  dp ON fc.target_type = 'driver_profile'  AND dp.id = fc.target_id AND dp.deleted_at IS NULL
      LEFT JOIN vehicle_profiles vp ON fc.target_type = 'vehicle_profile' AND vp.id = fc.target_id AND vp.deleted_at IS NULL
      LEFT JOIN hostess_profiles hp ON fc.target_type = 'hostess_profile' AND hp.id = fc.target_id AND hp.deleted_at IS NULL
      WHERE fc.disconnected_at IS NULL
        AND c.deleted_at IS NULL
        AND (
             (fc.target_type = 'driver_profile'  AND dp.user_id = ?)
          OR (fc.target_type = 'vehicle_profile' AND vp.owner_user_id = ?)
          OR (fc.target_type = 'hostess_profile' AND hp.managed_by_user_id = ?)
        )
      ORDER BY c.name ASC`,
    [userId, userId, userId]
  );
  return rows;
}

async function findMembership(userId, companyId) {
  const [rows] = await db.query(
    `SELECT
        c.id, c.name, c.tax_number, c.company_type, c.is_active,
        r.id AS role_id, r.name AS role_name, r.display_name AS role_display_name
      FROM company_users cu
      INNER JOIN companies c ON c.id = cu.company_id
      INNER JOIN roles     r ON r.id = cu.role_id
      WHERE cu.user_id = ?
        AND cu.company_id = ?
        AND cu.deleted_at IS NULL
        AND c.deleted_at  IS NULL
      LIMIT 1`,
    [userId, companyId]
  );
  return rows[0] || null;
}

// Bir kurumun birincil iletişim noktası — company_admin rolündeki en eski aktif üye.
// Detay sayfasında "karşı tarafa ulaş" butonu için tek bir kişi göstermek istiyoruz.
async function findPrimaryContactByCompanyId(companyId) {
  const [rows] = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email
       FROM company_users cu
       INNER JOIN users u ON u.id = cu.user_id
       INNER JOIN roles r ON r.id = cu.role_id
      WHERE cu.company_id = ?
        AND cu.deleted_at IS NULL
        AND u.deleted_at  IS NULL
        AND r.name = 'company_admin'
      ORDER BY cu.created_at ASC
      LIMIT 1`,
    [companyId]
  );
  return rows[0] || null;
}

// Bir kurumun yönetim rollerindeki (admin + moderator) aktif üyeleri.
// Kurum bağlamlı bildirimi kime yollayacağımızı bu döndürür.
async function findManagersByCompanyId(companyId) {
  const [rows] = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, r.name AS role_name
       FROM company_users cu
       INNER JOIN users u ON u.id = cu.user_id
       INNER JOIN roles r ON r.id = cu.role_id
      WHERE cu.company_id = ?
        AND cu.deleted_at IS NULL
        AND u.deleted_at  IS NULL
        AND r.name IN ('company_admin','company_moderator')`,
    [companyId]
  );
  return rows;
}

async function findPendingApproval() {
  const [rows] = await db.query(
    `SELECT c.*,
        (SELECT u.first_name FROM company_users cu
           JOIN users u ON u.id = cu.user_id
           JOIN roles r ON r.id = cu.role_id
          WHERE cu.company_id = c.id AND r.name = 'company_admin'
            AND cu.deleted_at IS NULL LIMIT 1) AS admin_first_name,
        (SELECT u.last_name FROM company_users cu
           JOIN users u ON u.id = cu.user_id
           JOIN roles r ON r.id = cu.role_id
          WHERE cu.company_id = c.id AND r.name = 'company_admin'
            AND cu.deleted_at IS NULL LIMIT 1) AS admin_last_name,
        (SELECT u.email FROM company_users cu
           JOIN users u ON u.id = cu.user_id
           JOIN roles r ON r.id = cu.role_id
          WHERE cu.company_id = c.id AND r.name = 'company_admin'
            AND cu.deleted_at IS NULL LIMIT 1) AS admin_email
      FROM companies c
      WHERE c.is_active = FALSE AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`
  );
  return rows;
}

async function activate(id) {
  const [result] = await db.query(
    `UPDATE companies SET is_active = TRUE
      WHERE id = ? AND is_active = FALSE AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    `UPDATE companies SET deleted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  findByTaxNumber, findById, createWithAdmin, findByUserId, findByFleetMembership, findMembership,
  findManagersByCompanyId,
  findPrimaryContactByCompanyId,
  findPendingApproval, activate, softDelete,
};
