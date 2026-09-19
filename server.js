require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const MySQLStore = require('express-mysql-session')(session);

const db = require('./config/db');
const { csrfProtection, csrfToken } = require('./config/csrf');

// Kritik sırların varlığını boot'ta doğrula — eksikse hiç ayağa kalkma.
// (Prod'da zayıf/boş secret sessiz felaket; erken ve gürültülü patla.)
['SESSION_SECRET', 'CSRF_SECRET'].forEach((k) => {
  if (!process.env[k]) {
    console.error(`FATAL: ${k} tanımlı değil (.env). Sunucu başlatılmıyor.`);
    process.exit(1);
  }
});

// Çökme dayanıklılığı: yakalanmamış hata/promise reddi süreci sessizce düşürmesin.
// Loglayıp uncaughtException'da kontrollü çıkıyoruz — süreç yöneticisi (PM2/Hostinger)
// temiz bir durumdan yeniden başlatsın. Bozuk bir state'te çalışmaya devam etmekten iyidir.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  process.exit(1);
});

// Global template locals middleware'leri
const currentUser = require('./middlewares/currentUser');
const currentCompany = require('./middlewares/currentCompany');
const notificationBadge = require('./middlewares/notificationBadge');

// Auth / yetki middleware'leri — mount seviyesinde uygulanır
const requireAuth = require('./middlewares/requireAuth');
const requireCompanyManager = require('./middlewares/requireCompanyManager');
const requireCompanyAdmin = require('./middlewares/requireCompanyAdmin');
const requireSuperAdmin = require('./middlewares/requireSuperAdmin');
const requireReceiverCompany = require('./middlewares/requireReceiverCompany');
const requireProviderCompany = require('./middlewares/requireProviderCompany');
const adminLocals = require('./middlewares/adminLocals');

// API katmanı için middleware'ler
const apiError = require('./middlewares/apiError');

// Route modülleri
const authWebRoutes = require('./routes/web/auth.routes');
const dashboardWebRoutes = require('./routes/web/dashboard.routes');
const companyWebRoutes = require('./routes/web/company.routes');
const driverWebRoutes = require('./routes/web/driver.routes');
const vehicleWebRoutes = require('./routes/web/vehicle.routes');
const hostessWebRoutes = require('./routes/web/hostess.routes');
const connectionWebRoutes = require('./routes/web/connection.routes');
const fleetWebRoutes = require('./routes/web/fleet.routes');
const contractWebRoutes = require('./routes/web/contract.routes');
const companyDocRequirementsWebRoutes = require('./routes/web/company-document-requirements.routes');
const partnershipWebRoutes = require('./routes/web/partnership.routes');
const partnershipInvitationWebRoutes = require('./routes/web/partnership-invitation.routes');
const partnershipRedeemWebRoutes = require('./routes/web/partnership-redeem.routes');
const redeemWebRoutes = require('./routes/web/redeem.routes');
const notificationWebRoutes = require('./routes/web/notification.routes');
const documentWebRoutes = require('./routes/web/document.routes');
const profileWebRoutes = require('./routes/web/profile.routes');
const adminWebRoutes = require('./routes/web/admin.routes');

// API v1 route modülleri
const authApiRoutes = require('./routes/api/v1/auth.routes');

const documentExpiryJob = require('./jobs/documentExpiryJob');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Reverse proxy (nginx/caddy) arkasındaysak: orijinal HTTPS bilgisini X-Forwarded-Proto'dan al.
// Bu satır olmadan prod'da secure cookie hiç gönderilmez (Node "istek HTTP geldi" sanır).
app.set('trust proxy', 1);

// Güvenlik header'ları (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS...).
// CSP kapalı: sayfalarda inline script/style + CDN'ler (Tailwind, SweetAlert, fonts) var;
// doğru bir CSP ayrı bir iş — şimdilik diğer header'ları alıyoruz.
app.use(helmet({ contentSecurityPolicy: false }));

// İstek loglama — prod'da 'combined' (Apache formatı), dev'de 'dev' (renkli/kısa).
app.use(morgan(isProd ? 'combined' : 'dev'));

// Sağlık kontrolü — load balancer / uptime izleme için. DB'ye ping atar.
// Statik/route zincirinden önce, hafif ve auth'suz.
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
    } catch (err) {
        res.status(503).json({ status: 'error', message: 'db unreachable' });
    }
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Statik dosyalar (CSS, resim, client-side JS) — public/ klasörü kökten servis edilir
app.use(express.static(path.join(__dirname, 'public')));

// Body parser + cookie parser (CSRF çerezi okumak için cookie-parser şart)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// CORS — sadece /api. Allowlist: env CORS_ORIGINS (virgülle), yoksa dev'de serbest.
const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
app.use('/api', cors({
    origin: corsOrigins.length ? corsOrigins : (isProd ? false : true),
    credentials: true,
}));

// Session — kalıcı store (MySQL). MemoryStore prod'da sızıntı + restart'ta herkesi düşürür.
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    createDatabaseTable: true,          // sessions tablosunu yoksa kur
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 8 * 60 * 60 * 1000,
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,                     // aktif kullanıcı sürekli çalışırken çıkarılmasın
    cookie: {
        httpOnly: true,                // JS document.cookie okumasın (XSS savunması)
        secure: isProd,                // prod'da sadece HTTPS'te gönder, dev'de HTTP OK
        sameSite: 'lax',               // başka site senin cookie'nle istek atmasın (CSRF savunması)
        maxAge: 1000 * 60 * 60 * 8,   // 8 saat
    },
}));

// CSRF — /api hariç tüm state-değiştiren isteklerde doğrula + her render'a token bırak.
app.use(csrfProtection);
app.use(csrfToken);

// Her template'e currentUser, currentCompany ve bildirim sayacını gönder
app.use(currentUser);
app.use(currentCompany);
app.use(notificationBadge);

// ==============================================================
// Rotalar — mount prefix + middleware zinciri tek yerde
//
// Route dosyaları prefix'ten arınmış path'ler tanımlar
// (örn: connection.routes.js sadece '/' '/create' yazar,
//  mount prefix '/company/connections' server tarafında verilir).
// Middleware'leri de burada zincirliyoruz; route dosyaları
// yetki kontrolüyle uğraşmıyor.
// ==============================================================

app.get('/', (req, res) => {
    res.render('home', { title: 'Anasayfa' });
});

// Public — herkese açık
app.use(authWebRoutes);

// Sadece giriş gerektirenler
app.use('/dashboard',           requireAuth, dashboardWebRoutes);
app.use('/companies',           requireAuth, companyWebRoutes);
app.use('/driver',              requireAuth, driverWebRoutes);
app.use('/vehicles',            requireAuth, vehicleWebRoutes);
app.use('/hostess',             requireAuth, hostessWebRoutes);
app.use('/notifications',       requireAuth, notificationWebRoutes);
app.use('/documents',           requireAuth, documentWebRoutes);
app.use('/profile',             requireAuth, profileWebRoutes);
app.use('/connections/redeem',  requireAuth, redeemWebRoutes);

// Kurum yönetim rotaları — admin veya moderator
// Fleet OTP kodu üretme sadece provider'a özel (receiver kendi filoya doğrudan üye almaz)
app.use('/company/connections', requireAuth, requireCompanyManager, requireProviderCompany, connectionWebRoutes);
app.use('/company/fleet',       requireAuth, requireCompanyManager, fleetWebRoutes);
app.use('/company/contracts',   requireAuth, requireCompanyManager, contractWebRoutes);
app.use('/company/document-requirements', requireAuth, requireCompanyManager, requireReceiverCompany, companyDocRequirementsWebRoutes);

// Kurum-kurum iş ortaklığı — yalnız admin
// Invitations subpath'i ÖNCE mount edilmeli (Express match sırası) — hem admin hem provider olmalı.
// Ortaklık listeleme/detay/fesih her kurum admin'ine açık.
app.use('/company/partnerships/invitations', requireAuth, requireCompanyAdmin, requireProviderCompany, partnershipInvitationWebRoutes);
app.use('/company/partnerships', requireAuth, requireCompanyAdmin, partnershipWebRoutes);
app.use('/partnerships/redeem',  requireAuth, requireCompanyAdmin, partnershipRedeemWebRoutes);

// SuperAdmin paneli
app.use('/admin', requireSuperAdmin, adminLocals, adminWebRoutes);

// ==============================================================
// API v1 rotaları — JSON döner, session/cookie kullanmaz (JWT)
// ==============================================================
app.use('/api/v1/auth', authApiRoutes);
// Sonradan eklenecek: notifications, driver, vehicles, fleet...

// API error handler — TÜM API route'larından SONRA gelmeli.
// Express error middleware'i (err, req, res, next) 4 argümanlı imzayla
// tanır ve throw/next(err) olanları buraya yönlendirir.
app.use('/api', apiError);

// ==============================================================
// 404 — hiçbir route eşleşmedi. /api altında JSON, web'de 404 sayfası.
// ==============================================================
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.status(404).render('errors/404', { title: 'Sayfa bulunamadı', layout: 'layouts/main' });
});

// ==============================================================
// Web global hata yakalayıcı — controller'da yakalanmamış hata buraya düşer.
// Hatayı sunucuda loglar; kullanıcıya ASLA stack trace göstermez, sade 500 sayfası döner.
// (4 argümanlı imza şart — Express bunu error handler olarak tanır.)
// ==============================================================
app.use((err, req, res, next) => {
    console.error('[web error]', req.method, req.originalUrl, '\n', err.stack || err);
    if (res.headersSent) return next(err);
    if (req.path.startsWith('/api')) {
        return res.status(500).json({ error: 'Sunucu hatası' });
    }
    res.status(500).render('errors/500', { title: 'Bir şeyler ters gitti', layout: 'layouts/main' });
});

documentExpiryJob.register();

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
