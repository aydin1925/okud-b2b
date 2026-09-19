const db = require('../config/db');

// SuperAdmin dashboard için gerçek sistem sayımları. Sadece SQL.
// Tüm "bu ay / geçen ay / bu hafta / bugün" pencereleri MySQL tarafında hesaplanır.

async function one(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows[0] || {};
}

// Kurumlar: aktif toplam + bu ay / geçen ay yeni (büyüme için).
async function companyStats() {
  return one(`
    SELECT
      SUM(is_active = 1 AND deleted_at IS NULL)                                          AS active,
      SUM(deleted_at IS NULL AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01'))           AS newThisMonth,
      SUM(deleted_at IS NULL
          AND created_at >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01')
          AND created_at <  DATE_FORMAT(NOW(), '%Y-%m-01'))                              AS newLastMonth
    FROM companies
  `);
}

// Kullanıcılar: toplam + bu hafta yeni.
async function userStats() {
  return one(`
    SELECT
      SUM(deleted_at IS NULL)                                                AS total,
      SUM(deleted_at IS NULL AND created_at >= NOW() - INTERVAL 7 DAY)       AS newThisWeek,
      SUM(deleted_at IS NULL AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')) AS newThisMonth
    FROM users
  `);
}

// Evrak: toplam + bugün + bu ay yüklenen.
async function documentStats() {
  return one(`
    SELECT
      SUM(deleted_at IS NULL)                                                  AS total,
      SUM(deleted_at IS NULL AND created_at >= CURDATE())                      AS newToday,
      SUM(deleted_at IS NULL AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')) AS newThisMonth
    FROM documents
  `);
}

// İş ortaklıkları: aktif toplam + bu ay yeni.
async function partnershipStats() {
  return one(`
    SELECT
      SUM(terminated_at IS NULL)                                        AS active,
      SUM(started_at >= DATE_FORMAT(NOW(), '%Y-%m-01'))                 AS newThisMonth
    FROM company_partnerships
  `);
}

// Son 24 saatteki belge kararları (audit_logs'tan): onay + ret sayısı.
async function documentDecisionsLast24h() {
  return one(`
    SELECT
      SUM(action = 'document.verify') AS verified,
      SUM(action = 'document.reject') AS rejected
    FROM audit_logs
    WHERE action IN ('document.verify','document.reject')
      AND created_at >= NOW() - INTERVAL 24 HOUR
  `);
}

module.exports = {
  companyStats,
  userStats,
  documentStats,
  partnershipStats,
  documentDecisionsLast24h,
};
