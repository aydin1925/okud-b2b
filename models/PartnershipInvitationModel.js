const db = require('../config/db');

async function create({ initiator_company_id, target_company_type, code, label, expires_at, created_by }) {
  const [result] = await db.query(
    `INSERT INTO partnership_invitations
       (initiator_company_id, target_company_type, code, label, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [initiator_company_id, target_company_type, code, label || null, expires_at, created_by]
  );
  return result.insertId;
}

async function findActiveByCode(code) {
  const [rows] = await db.query(
    `SELECT * FROM partnership_invitations
      WHERE code = ?
        AND status = 'pending'
        AND expires_at > NOW()
        AND deleted_at IS NULL
      LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function existsByCode(code) {
  const [rows] = await db.query(
    'SELECT id FROM partnership_invitations WHERE code = ? LIMIT 1',
    [code]
  );
  return rows.length > 0;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM partnership_invitations WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findPendingByCompany(companyId) {
  const [rows] = await db.query(
    `SELECT * FROM partnership_invitations
      WHERE initiator_company_id = ?
        AND status = 'pending'
        AND expires_at > NOW()
        AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [companyId]
  );
  return rows;
}

async function cancel(id, companyId) {
  const [result] = await db.query(
    `UPDATE partnership_invitations
        SET status = 'cancelled'
      WHERE id = ? AND initiator_company_id = ? AND status = 'pending' AND deleted_at IS NULL`,
    [id, companyId]
  );
  return result.affectedRows;
}

async function rejectByAdmin(id, userId) {
  const [result] = await db.query(
    `UPDATE partnership_invitations
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
  rejectByAdmin,
};
