const db = require('../config/db');

// Aynı belge + tür + eşik + kullanıcı dörtlüsü için bildirim var mı?
// user_id ayrımı sayesinde aynı belgenin aynı eşiği farklı kişiler için
// (belge sahibi + kurum admin'i + kurum moderator'ı) ayrı satır olarak düşebilir,
// ama aynı kullanıcı ikinci kez uyarılmaz.
async function existsForDocumentAndTypeAndThresholdAndUser(documentId, type, thresholdDays, userId) {
  const [rows] = await db.query(
    `SELECT id FROM notifications
      WHERE document_id = ?
        AND type = ?
        AND user_id = ?
        AND (
          (threshold_days IS NULL AND ? IS NULL)
          OR threshold_days = ?
        )
        AND deleted_at IS NULL
      LIMIT 1`,
    [documentId, type, userId, thresholdDays, thresholdDays]
  );
  return rows.length > 0;
}

async function create({ user_id, company_id, type, document_id, threshold_days, title, message, email_sent_at }) {
  const [result] = await db.query(
    `INSERT INTO notifications
       (user_id, company_id, type, document_id, threshold_days, title, message, email_sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      company_id || null,
      type,
      document_id || null,
      threshold_days === undefined ? null : threshold_days,
      title,
      message,
      email_sent_at || null,
    ]
  );
  return result.insertId;
}

// filter değerleri: 'all' | 'personal' | 'company' | 'unread'
// Bilinmeyen değerler 'all' gibi davranır.
async function findByUserId(userId, { filter = 'all' } = {}) {
  let extra = '';
  if (filter === 'personal')      extra = ' AND n.company_id IS NULL';
  else if (filter === 'company')  extra = ' AND n.company_id IS NOT NULL';
  else if (filter === 'unread')   extra = ' AND n.read_at IS NULL';

  const [rows] = await db.query(
    `SELECT n.*, c.name AS company_name
       FROM notifications n
       LEFT JOIN companies c ON c.id = n.company_id
      WHERE n.user_id = ? AND n.deleted_at IS NULL${extra}
      ORDER BY n.created_at DESC`,
    [userId]
  );
  return rows;
}

async function countUnreadByUserId(userId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM notifications
      WHERE user_id = ? AND read_at IS NULL AND deleted_at IS NULL`,
    [userId]
  );
  return rows[0].cnt;
}

// Kullanıcı bazlı özet — filtre chip'lerinde sayı göstermek için
async function countsByUser(userId) {
  const [rows] = await db.query(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread,
        SUM(CASE WHEN company_id IS NULL THEN 1 ELSE 0 END) AS personal,
        SUM(CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END) AS company
       FROM notifications
      WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  const r = rows[0] || {};
  return {
    total:    Number(r.total    || 0),
    unread:   Number(r.unread   || 0),
    personal: Number(r.personal || 0),
    company:  Number(r.company  || 0),
  };
}

async function markAsRead(id, userId) {
  const [result] = await db.query(
    `UPDATE notifications
        SET read_at = NOW()
      WHERE id = ? AND user_id = ? AND read_at IS NULL AND deleted_at IS NULL`,
    [id, userId]
  );
  return result.affectedRows;
}

async function markAllAsRead(userId) {
  const [result] = await db.query(
    `UPDATE notifications
        SET read_at = NOW()
      WHERE user_id = ? AND read_at IS NULL AND deleted_at IS NULL`,
    [userId]
  );
  return result.affectedRows;
}

// user_id kısıtı zorunlu — başka kullanıcının bildirimini silme ihtimalini kapatır.
async function softDelete(id, userId) {
  const [result] = await db.query(
    `UPDATE notifications
        SET deleted_at = NOW()
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [id, userId]
  );
  return result.affectedRows;
}

// filter: 'all' | 'personal' | 'company' | 'unread'
// Kullanıcının aktif filtre görünümüne düşen bildirimlerin hepsini yumuşak siler.
async function softDeleteAllForUser(userId, { filter = 'all' } = {}) {
  let extra = '';
  if (filter === 'personal')      extra = ' AND company_id IS NULL';
  else if (filter === 'company')  extra = ' AND company_id IS NOT NULL';
  else if (filter === 'unread')   extra = ' AND read_at IS NULL';

  const [result] = await db.query(
    `UPDATE notifications
        SET deleted_at = NOW()
      WHERE user_id = ? AND deleted_at IS NULL${extra}`,
    [userId]
  );
  return result.affectedRows;
}

module.exports = {
  existsForDocumentAndTypeAndThresholdAndUser,
  create,
  findByUserId,
  countUnreadByUserId,
  countsByUser,
  markAsRead,
  markAllAsRead,
  softDelete,
  softDeleteAllForUser,
};
