const db = require('../config/db');

/**
 * Tek satır ekle. Bu tablonun TEK yazma yolu — bilerek update/delete yok.
 * metadata: JS objesi verilir, JSON.stringify ile string'e çevrilir (NULL olabilir).
 */
async function create({ actor_user_id, company_id, action, entity_type, entity_id, metadata, ip_address }) {
  const [result] = await db.query(
    `INSERT INTO audit_logs
       (actor_user_id, company_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      actor_user_id ?? null,
      company_id ?? null,
      action,
      entity_type ?? null,
      entity_id ?? null,
      metadata != null ? JSON.stringify(metadata) : null,
      ip_address ?? null,
    ]
  );
  return result.insertId;
}

/**
 * Filtreli + sayfalı listeleme. Görünüm (/admin/audit) için.
 * Dönen satırlara actor_email JOIN ile eklenir (kim yaptı okunabilir olsun).
 * filters: { action, actorUserId, from, to, limit, offset }
 */
async function search({ action, actorUserId, from, to, limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = [];

  if (action)      { where.push('a.action = ?');          params.push(action); }
  if (actorUserId) { where.push('a.actor_user_id = ?');   params.push(actorUserId); }
  if (from)        { where.push('a.created_at >= ?');      params.push(from); }
  if (to)          { where.push('a.created_at <= ?');      params.push(to); }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await db.query(
    `SELECT a.*, u.email AS actor_email,
            CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
            c.name AS company_name
       FROM audit_logs a
       LEFT JOIN users u     ON u.id = a.actor_user_id
       LEFT JOIN companies c ON c.id = a.company_id
       ${whereSql}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  // metadata bu kurulumda string olarak dönebiliyor — görünüm objeye güveniyor.
  return rows.map((r) => ({ ...r, metadata: parseMetadata(r.metadata) }));
}

// JSON kolonu string ya da obje dönebilir; her iki durumu da güvenle objeye çevir.
function parseMetadata(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

/**
 * search() ile aynı filtreye uyan toplam satır sayısı — sayfalama için.
 */
async function count({ action, actorUserId, from, to } = {}) {
  const where = [];
  const params = [];

  if (action)      { where.push('action = ?');          params.push(action); }
  if (actorUserId) { where.push('actor_user_id = ?');   params.push(actorUserId); }
  if (from)        { where.push('created_at >= ?');      params.push(from); }
  if (to)          { where.push('created_at <= ?');      params.push(to); }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`,
    params
  );
  return rows[0].total;
}

module.exports = { create, search, count };
