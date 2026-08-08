const db = require('../config/db');

async function create({ company_id, target_type, code, label, expires_at, created_by }) {
  const [result] = await db.query(
    `INSERT INTO connection_requests
       (company_id, target_type, code, label, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [company_id, target_type, code, label || null, expires_at, created_by]
  );
  return result.insertId;
}

// Aktif (pending + süresi geçmemiş) bir kodu getirir. 17b'de kabul için kullanılacak.
async function findActiveByCode(code) {
  const [rows] = await db.query(
    `SELECT * FROM connection_requests
      WHERE code = ?
        AND status = 'pending'
        AND expires_at > NOW()
        AND deleted_at IS NULL
      LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

// Herhangi bir kodun DB'de var olup olmadığını kontrol eder (üretim sırasında çakışma testi).
async function existsByCode(code) {
  const [rows] = await db.query(
    'SELECT id FROM connection_requests WHERE code = ? LIMIT 1',
    [code]
  );
  return rows.length > 0;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM connection_requests WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

// Kurumun onay bekleyen, süresi geçmemiş kodları (en yeni önce).
async function findPendingByCompany(companyId) {
  const [rows] = await db.query(
    `SELECT * FROM connection_requests
      WHERE company_id = ?
        AND status = 'pending'
        AND expires_at > NOW()
        AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [companyId]
  );
  return rows;
}

// Sadece pending durumdaki, bu kuruma ait kodu iptal eder (optimistic guard).
async function cancel(id, companyId) {
  const [result] = await db.query(
    `UPDATE connection_requests
        SET status = 'cancelled'
      WHERE id = ? AND company_id = ? AND status = 'pending' AND deleted_at IS NULL`,
    [id, companyId]
  );
  return result.affectedRows;
}

// Davetlinin kodu reddetmesi — status='rejected', consumed_by=davetli, consumed_at=now
async function rejectByUser(id, userId) {
  const [result] = await db.query(
    `UPDATE connection_requests
        SET status = 'rejected', consumed_by = ?, consumed_at = NOW()
      WHERE id = ? AND status = 'pending' AND expires_at > NOW() AND deleted_at IS NULL`,
    [userId, id]
  );
  return result.affectedRows;
}

module.exports = {
  create,
  findActiveByCode,
  existsByCode,
  findById,
  findPendingByCompany,
  cancel,
  rejectByUser,
};
