const db = require('../config/db');

/**
 * Yeni token satırı ekle.
 * token_hash: sha256(rawToken) — ham token DB'ye asla yazılmaz.
 * expires_at: JS Date objesi.
 */
async function create({ user_id, type, token_hash, expires_at }) {
  const [result] = await db.query(
    `INSERT INTO user_tokens (user_id, type, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [user_id, type, token_hash, expires_at]
  );
  return result.insertId;
}

/**
 * Gelen hash'e uyan, geçerli (süresi dolmamış + henüz kullanılmamış), doğru tipteki
 * satırı döndürür. Yoksa null. consume() akışının kalbi.
 */
async function findValidByHash(token_hash, type) {
  const [rows] = await db.query(
    `SELECT * FROM user_tokens
      WHERE token_hash = ?
        AND type       = ?
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1`,
    [token_hash, type]
  );
  return rows[0] || null;
}

/**
 * Token'ı kullanıldı olarak işaretle. Zaten used_at doluysa 0 döner (idempotent).
 * Yarış korumalı: WHERE used_at IS NULL sayesinde eşzamanlı iki consume'dan biri boşa çıkar.
 */
async function markUsed(id) {
  const [result] = await db.query(
    `UPDATE user_tokens
        SET used_at = NOW()
      WHERE id = ? AND used_at IS NULL`,
    [id]
  );
  return result.affectedRows;
}

/**
 * Bir kullanıcının belirli tipteki tüm aktif (kullanılmamış + süresi dolmamış) token'larını
 * "kullanıldı" olarak işaretle. Yeni token istenirken eskileri geçersizleştirmek için —
 * spam ve saldırgan senaryosunu kısıtlar.
 */
async function invalidateActiveByUserAndType(user_id, type) {
  const [result] = await db.query(
    `UPDATE user_tokens
        SET used_at = NOW()
      WHERE user_id = ? AND type = ?
        AND used_at IS NULL AND expires_at > NOW()`,
    [user_id, type]
  );
  return result.affectedRows;
}

/**
 * Süresi 30+ gün önce dolmuş satırları temizle. Cron için — token tablosu şişmesin.
 */
async function cleanupExpired() {
  const [result] = await db.query(
    `DELETE FROM user_tokens
      WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  return result.affectedRows;
}

module.exports = {
  create,
  findValidByHash,
  markUsed,
  invalidateActiveByUserAndType,
  cleanupExpired,
};
