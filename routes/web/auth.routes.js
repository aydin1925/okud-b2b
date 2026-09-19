const express = require('express');
const AuthController = require('../../controllers/web/AuthController');
const requireAuth = require('../../middlewares/requireAuth');
const { loginLimiter, registerLimiter, forgotLimiter } = require('../../config/rateLimit');

const router = express.Router();

// Sadece bu route'lardaki GET/POST render'larında navbar/footer gizlensin.
// (Router root prefix'siz mount edildiği için router.use kullanırsak
//  eşleşmeyen tüm request'lere de sızar — yalnız bu route'lara takıyoruz.)
const hideChrome = (req, res, next) => { res.locals.hideChrome = true; next(); };

// Kayıt / Giriş
router.get('/register', hideChrome, AuthController.showRegisterForm);
router.post('/register', registerLimiter, hideChrome, AuthController.register);

router.get('/login', hideChrome, AuthController.showLoginForm);
router.post('/login', loginLimiter, hideChrome, AuthController.login);

router.post('/logout', AuthController.logout);

// Şifremi unuttum (public)
router.get('/forgot-password', hideChrome, AuthController.showForgotForm);
router.post('/forgot-password', forgotLimiter, hideChrome, AuthController.sendForgot);

router.get('/reset-password', hideChrome, AuthController.showResetForm);
router.post('/reset-password', hideChrome, AuthController.doReset);

// E-posta doğrulama
router.get('/verify-email', hideChrome, AuthController.verifyEmail);
router.post('/verify-email/resend', requireAuth, AuthController.resendVerification);

module.exports = router;
