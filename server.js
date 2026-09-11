require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const cors = require('cors');

const db = require('./config/db');

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
const profileWebRoutes = require('./routes/web/profile.routes');
const adminWebRoutes = require('./routes/web/admin.routes');

// API v1 route modülleri
const authApiRoutes = require('./routes/api/v1/auth.routes');

const documentExpiryJob = require('./jobs/documentExpiryJob');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Statik dosyalar (CSS, resim, client-side JS) — public/ klasörü kökten servis edilir
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS — sadece /api rotalarında. Flutter native CORS'a takılmaz ama
// Flutter web build ve tarayıcı testleri için hazır olalım.
app.use('/api', cors());

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 8,
    },
}));

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

documentExpiryJob.register();

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
