const db = require('../config/db');

async function findByCompanyAndType(companyId, contractType) {
  const [rows] = await db.query(
    `SELECT * FROM contract_templates
      WHERE company_id = ? AND contract_type = ? AND deleted_at IS NULL
      LIMIT 1`,
    [companyId, contractType]
  );
  return rows[0] || null;
}

async function findByCompany(companyId) {
  const [rows] = await db.query(
    `SELECT * FROM contract_templates
      WHERE company_id = ? AND deleted_at IS NULL`,
    [companyId]
  );
  return rows;
}

// UPSERT — UNIQUE (company_id, contract_type) sayesinde çakışma yönetilir.
// Yeni satır insert ederiz; çakışırsa title+content'i günceller.
async function upsert({ company_id, contract_type, title, content }) {
  const [result] = await db.query(
    `INSERT INTO contract_templates (company_id, contract_type, title, content)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        content = VALUES(content),
        updated_at = CURRENT_TIMESTAMP`,
    [company_id, contract_type, title, content]
  );
  return result.insertId || null;
}

async function remove(companyId, contractType) {
  const [result] = await db.query(
    `DELETE FROM contract_templates
      WHERE company_id = ? AND contract_type = ?`,
    [companyId, contractType]
  );
  return result.affectedRows;
}

module.exports = { findByCompanyAndType, findByCompany, upsert, remove };
