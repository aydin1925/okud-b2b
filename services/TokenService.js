const crypto = require('crypto');
const UserTokenModel = require('../models/UserTokenModel');
const { TOKEN_TYPES, TOKEN_TTL_MINUTES } = require('../utils/constants');

const VALID_TYPES = Object.values(TOKEN_TYPES);

// Ham token'ı hex sha256'lar. DB'ye hep bu hash yazılır, karşılaştırma da bu hash üzerinden.
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Yeni token üretir + DB'ye hash'ini yazar.
 * Aynı kullanıcının aynı tipteki eski aktif token'larını invalidate eder — ki
 * eski link'ler (mailde kalanlar, saldırganın kaptıkları) devre dışı kalsın.
 *
 * Döner: { rawToken, expiresAt }
 *   - rawToken → mail linkinde kullanılır (asla DB'ye yazma!)
 *   - expiresAt → mail metninde "1 saat geçerli" göstermek için
 */
async function generateAndSave(userId, type) {
  if (!VALID_TYPES.includes(type)) {
    throw new Error('Geçersiz token türü: ' + type);
  }

  // Aynı türden eski aktif token'ları geçersizleştir
  await UserTokenModel.invalidateActiveByUserAndType(userId, type);

  // 32 rastgele byte → base64url (43 karakter, URL-safe: A-Z a-z 0-9 - _)
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const token_hash = hashToken(rawToken);

  const ttlMin = TOKEN_TTL_MINUTES[type];
  const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

  await UserTokenModel.create({
    user_id: userId,
    type,
    token_hash,
    expires_at: expiresAt,
  });

  return { rawToken, expiresAt };
}

/**
 * Ham token'ı hash'leyip DB'de arar. Bulursa: markUsed + user_id döner.
 * Bulamazsa (yok / süresi dolmuş / zaten kullanılmış / yanlış tip): hata fırlatır.
 *
 * consume tek satır işi: bu adımdan sonra çağıran (şifre değiştir, email doğrula)
 * güvenle işini yapar.
 */
async function consume(rawToken, expectedType) {
  if (!rawToken) throw new Error('Bu link geçersiz.');
  if (!VALID_TYPES.includes(expectedType)) {
    throw new Error('Geçersiz token türü.');
  }

  const token_hash = hashToken(rawToken);
  const row = await UserTokenModel.findValidByHash(token_hash, expectedType);

  if (!row) {
    throw new Error('Bu link geçersiz ya da süresi dolmuş.');
  }

  const affected = await UserTokenModel.markUsed(row.id);
  if (!affected) {
    // Eşzamanlı consume — biri kazandı, biz kaybettik
    throw new Error('Bu link az önce kullanıldı.');
  }

  return { userId: row.user_id, tokenId: row.id };
}

module.exports = { generateAndSave, consume, hashToken };
