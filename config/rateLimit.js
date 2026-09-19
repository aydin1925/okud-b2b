// Brute-force / kötüye kullanım koruması — express-rate-limit.
// Her limiter belirli bir pencerede belirli sayıda isteğe izin verir, aşınca 429 döner.
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

// Ortak: aşım halinde kullanıcıya sade bir mesaj (form akışları için düz metin yeterli).
function tooMany(message) {
  return (req, res) => {
    res.status(429).send(
      `${message} <a href="${req.get('Referer') || '/'}">Geri dön</a>`
    );
  };
}

// Giriş denemesi: IP + email bazlı. Aynı hesabı ya da aynı IP'yi hedefleyen
// brute-force'u kısar. 15 dk içinde 10 deneme.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // IPv6'yı güvenli normalize etmek için ipKeyGenerator helper'ı şart (v7 kuralı).
  keyGenerator: (req) =>
    ipKeyGenerator(req.ip) + '|' + String((req.body && req.body.email) || '').toLowerCase(),
  handler: tooMany('Çok fazla giriş denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.'),
});

// Kayıt: IP bazlı, saatte 5. Sahte hesap üretimini kısar.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 5 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Çok fazla kayıt denemesi. Lütfen bir süre sonra tekrar deneyin.'),
});

// Şifre sıfırlama isteği: IP bazlı, saatte 5. Mail bombardımanını önler.
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 5 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Çok fazla şifre sıfırlama isteği. Lütfen bir süre sonra tekrar deneyin.'),
});

// Davet kodu deneme (OTP): IP bazlı, 15 dk'da 20. Kod brute-force'unu kısar.
const redeemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 20 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Çok fazla kod denemesi. Lütfen 15 dakika sonra tekrar deneyin.'),
});

module.exports = { loginLimiter, registerLimiter, forgotLimiter, redeemLimiter };
