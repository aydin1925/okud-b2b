const db = require('../config/db');

/**
 * Kurumun belge gereksinim şablonu — saf SQL katmanı.
 * Bir satır = bir kurum + bir hedef tipi (driver/vehicle/hostess) + bir belge tipi.
 */

async function findByCompany(companyId) {
  const [rows] = await db.query(
    `SELECT id, company_id, target_type, document_type
       FROM company_document_requirements
      WHERE company_id = ?
      ORDER BY target_type ASC, document_type ASC`,
    [companyId]
  );
  return rows;
}

async function findByCompanyAndTarget(companyId, targetType) {
  const [rows] = await db.query(
    `SELECT id, document_type
       FROM company_document_requirements
      WHERE company_id = ? AND target_type = ?
      ORDER BY document_type ASC`,
    [companyId, targetType]
  );
  return rows;
}

/**
 * Bir hedef tipinin gereksinim listesini komple değiştirir.
 * Transaction: eski satırları sil + yeni listeyi INSERT et.
 * documentTypes boş dizi ise sadece silme yapar (o hedef için hiç gereksinim yok).
 */
async function replaceBulk(companyId, targetType, documentTypes) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM company_document_requirements
        WHERE company_id = ? AND target_type = ?`,
      [companyId, targetType]
    );

    if (documentTypes.length > 0) {
      const values = documentTypes.map(() => '(?, ?, ?)').join(', ');
      const params = [];
      for (const type of documentTypes) {
        params.push(companyId, targetType, type);
      }
      await conn.query(
        `INSERT INTO company_document_requirements
           (company_id, target_type, document_type)
         VALUES ${values}`,
        params
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

module.exports = { findByCompany, findByCompanyAndTarget, replaceBulk };
