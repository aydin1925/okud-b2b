require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

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

// Route modülleri
const authWebRoutes = require('./routes/web/auth.routes');
const dashboardWebRoutes = require('./routes/web/dashboard.routes');
const companyWebRoutes = require('./routes/web/company.routes');
const driverWebRoutes = require('./routes/web/driver.routes');
const vehicleWebRoutes = require('./routes/web/vehicle.routes');
const connectionWebRoutes = require('./routes/web/connection.routes');
const fleetWebRoutes = require('./routes/web/fleet.routes');
const contractWebRoutes = require('./routes/web/contract.routes');
const partnershipWebRoutes = require('./routes/web/partnership.routes');
const partnershipRedeemWebRoutes = require('./routes/web/partnership-redeem.routes');
const redeemWebRoutes = require('./routes/web/redeem.routes');
const notificationWebRoutes = require('./routes/web/notification.routes');
const profileWebRoutes = require('./routes/web/profile.routes');
const adminWebRoutes = require('./routes/web/admin.routes');
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
app.use('/notifications',       requireAuth, notificationWebRoutes);
app.use('/profile',             requireAuth, profileWebRoutes);
app.use('/connections/redeem',  requireAuth, redeemWebRoutes);

// Kurum yönetim rotaları — admin veya moderator
app.use('/company/connections', requireAuth, requireCompanyManager, connectionWebRoutes);
app.use('/company/fleet',       requireAuth, requireCompanyManager, fleetWebRoutes);
app.use('/company/contracts',   requireAuth, requireCompanyManager, contractWebRoutes);

// Kurum-kurum iş ortaklığı — yalnız admin
app.use('/company/partnerships', requireAuth, requireCompanyAdmin, partnershipWebRoutes);
app.use('/partnerships/redeem',  requireAuth, requireCompanyAdmin, partnershipRedeemWebRoutes);

// SuperAdmin paneli
app.use('/admin', requireSuperAdmin, adminWebRoutes);

documentExpiryJob.register();

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
