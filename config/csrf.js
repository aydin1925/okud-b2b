// CSRF koruması — csrf-csrf (double-submit cookie + HMAC).
// Token iki yerden gelir ve eşleşmeli: (1) sunucunun set ettiği çerez,
// (2) formdaki gizli _csrf alanı. Kötü site çerezi tetikleyebilir ama
// form değerini okuyamaz → sahte POST reddedilir.
const { doubleCsrf } = require('csrf-csrf');

const isProd = process.env.NODE_ENV === 'production';

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  // Token'ı oturuma bağla. Giriş yapmışsa userId, değilse sabit 'anon'
  // (anonim formlar login/register/forgot — GET ile POST arasında sabit kalmalı).
  getSessionIdentifier: (req) =>
    req.session && req.session.userId ? 'u' + req.session.userId : 'anon',
  cookieName: isProd ? '__Host-filoskope.x-csrf' : 'filoskope.x-csrf',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: isProd,
    httpOnly: true,
  },
  size: 32,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Token'ı önce form gövdesinde (_csrf), yoksa header'da ara (AJAX için).
  getCsrfTokenFromRequest: (req) =>
    (req.body && req.body._csrf) || req.headers['x-csrf-token'],
  errorConfig: {
    statusCode: 403,
    message: 'Güvenlik doğrulaması başarısız (CSRF). Sayfayı yenileyip tekrar deneyin.',
    code: 'EBADCSRFTOKEN',
  },
});

// /api hariç tüm state-değiştiren isteklerde doğrula.
// İSTİSNA: dosya yükleme (multipart) path'leri. Multipart body'yi multer route
// seviyesinde parse ettiği için _csrf alanı global middleware çalışırken henüz
// yok. Bu path'lerde CSRF, multer'dan SONRA route'ta çalışır (csrfProtectionRaw).
function isMultipartUpload(req) {
  return req.path.endsWith('/documents/upload');
}

function csrfProtection(req, res, next) {
  if (req.path.startsWith('/api')) return next();
  if (isMultipartUpload(req)) return next(); // route'ta multer sonrası doğrulanacak
  return doubleCsrfProtection(req, res, next);
}

// Multipart route'larda multer'dan SONRA elle çağrılacak ham doğrulayıcı.
const csrfProtectionRaw = doubleCsrfProtection;

// Her render'a taze token bırak — layout meta'sına ve formlara gömmek için.
function csrfToken(req, res, next) {
  try {
    res.locals.csrfToken = generateCsrfToken(req, res);
  } catch (e) {
    res.locals.csrfToken = '';
  }
  next();
}

module.exports = { csrfProtection, csrfProtectionRaw, csrfToken };
