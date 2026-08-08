const db = require('../config/db');

async function findByOwner(owner_type, owner_id) {
  const [rows] = await db.query(
    `SELECT * FROM documents
      WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [owner_type, owner_id]
  );
  return rows;
}

async function findLatestByType(owner_type, owner_id, document_type) {
  const [rows] = await db.query(
    `SELECT * FROM documents
      WHERE owner_type = ? AND owner_id = ? AND document_type = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [owner_type, owner_id, document_type]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({
  owner_type,
  owner_id,
  document_type,
  file_path,
  original_filename,
  mime_type,
  file_size,
  expires_at,
  uploaded_by,
}) {
  const [result] = await db.query(
    `INSERT INTO documents
       (owner_type, owner_id, document_type, file_path, original_filename,
        mime_type, file_size, expires_at, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      owner_type,
      owner_id,
      document_type,
      file_path,
      original_filename,
      mime_type,
      file_size,
      expires_at || null,
      uploaded_by,
    ]
  );
  return result.insertId;
}

async function findAllPending() {
  const [rows] = await db.query(
    `SELECT d.*, u.first_name, u.last_name, u.email
       FROM documents d
       INNER JOIN users u ON u.id = d.uploaded_by
      WHERE d.verification_status = 'pending' AND d.deleted_at IS NULL
      ORDER BY d.created_at ASC`
  );
  return rows;
}

async function verify(id, verifierId) {
  const [result] = await db.query(
    `UPDATE documents
        SET verification_status = 'verified',
            verified_by = ?,
            verified_at = NOW(),
            rejection_reason = NULL
      WHERE id = ? AND verification_status = 'pending' AND deleted_at IS NULL`,
    [verifierId, id]
  );
  return result.affectedRows;
}

async function reject(id, verifierId, reason) {
  const [result] = await db.query(
    `UPDATE documents
        SET verification_status = 'rejected',
            verified_by = ?,
            verified_at = NOW(),
            rejection_reason = ?
      WHERE id = ? AND verification_status = 'pending' AND deleted_at IS NULL`,
    [verifierId, reason, id]
  );
  return result.affectedRows;
}

// Cron taraması için — süre bilgisi olan tüm onaylı belgeler
async function findAllVerifiedWithExpiry() {
  const [rows] = await db.query(
    `SELECT * FROM documents
      WHERE verification_status = 'verified'
        AND expires_at IS NOT NULL
        AND deleted_at IS NULL`
  );
  return rows;
}

module.exports = { findByOwner, findLatestByType, findById, create, findAllPending, verify, reject, findAllVerifiedWithExpiry };
