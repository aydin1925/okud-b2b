const UserService = require('../../services/UserService');
const AuthService = require('../../services/AuthService');

// =====================================================================
// REGISTER
// =====================================================================

function showRegisterForm(req, res) {
    res.render('auth/register', {
        title: 'Kayıt ol',
        error: null,
        success: null,
        formData: {}
    });
}

async function register(req, res) {
    try {
        const user = await UserService.register(req.body);

        // Kayıt başarılı — doğrulama linkini sessizce gönder.
        // Mail patlarsa uygulama akışı kesilmesin — kullanıcı kayıt oldu zaten.
        try {
            await AuthService.sendEmailVerification(user.id);
        } catch (mailErr) {
            console.error('[register] verification mail atılamadı:', mailErr.message);
        }

        res.render('auth/register', {
            title: 'Kayıt Ol',
            error: null,
            success: `Kayıt başarılı! ${user.email} adresine doğrulama maili gönderildi.`,
            formData: {}
        });
    }
    catch(err) {
        res.status(400).render('auth/register', {
            title: 'Kayıt Ol',
            error: err.message,
            success: null,
            formData: req.body
        });
    }
}

// =====================================================================
// LOGIN / LOGOUT
// =====================================================================

function showLoginForm(req, res) {
    res.render('auth/login', {
        title: 'Giriş Yap',
        error: null,
        info: req.query.flash === 'pw-reset' ? 'Şifren değişti. Yeni şifrenle giriş yapabilirsin.' :
              req.query.flash === 'email-verified' ? 'E-posta adresin doğrulandı. Giriş yapabilirsin.' :
              null,
        formData: {}
    });
}

async function login(req, res) {
    try {
        const user = await AuthService.login(req.body);
        // Session'a kullanıcı bilgisini yaz
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = `${user.first_name} ${user.last_name}`;
        req.session.isSuperadmin = !!user.is_superadmin;
        req.session.emailVerifiedAt = user.email_verified_at || null;
        res.redirect('/dashboard');
    }
    catch(err) {
        res.status(400).render('auth/login', {
            title: 'Giriş Yap',
            error: err.message,
            info: null,
            formData: {email: req.body.email},
        });
    }
}

function logout(req, res) {
    req.session.destroy((err) => {
        if (err) console.error('Session destroy hatası: ', err);
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
}

// =====================================================================
// PASSWORD RESET
// =====================================================================

function showForgotForm(req, res) {
    res.render('auth/forgot-password', {
        title: 'Şifremi unuttum',
        error: null,
        sent: false,
        email: '',
    });
}

async function sendForgot(req, res) {
    const email = String(req.body.email || '').trim().toLowerCase();
    try {
        await AuthService.requestPasswordReset(email);
        // Her durumda aynı mesaj — user enumeration'ı önle
        res.render('auth/forgot-password', {
            title: 'Şifremi unuttum',
            error: null,
            sent: true,
            email,
        });
    } catch (err) {
        console.error('[forgot] hata:', err.message);
        // Kullanıcıya iç detay verme, yine aynı mesaj
        res.render('auth/forgot-password', {
            title: 'Şifremi unuttum',
            error: null,
            sent: true,
            email,
        });
    }
}

function showResetForm(req, res) {
    const token = String(req.query.token || '').trim();
    if (!token) {
        return res.status(400).render('auth/reset-password', {
            title: 'Şifreni sıfırla',
            error: 'Geçersiz bağlantı.',
            token: '',
            expired: true,
        });
    }
    res.render('auth/reset-password', {
        title: 'Şifreni sıfırla',
        error: null,
        token,
        expired: false,
    });
}

async function doReset(req, res) {
    const token = String(req.body.token || '').trim();
    try {
        await AuthService.resetPasswordWithToken(
            token, req.body.new_password, req.body.new_password_confirm
        );
        res.redirect('/login?flash=pw-reset');
    } catch (err) {
        res.status(400).render('auth/reset-password', {
            title: 'Şifreni sıfırla',
            error: err.message,
            token,
            expired: false,
        });
    }
}

// =====================================================================
// EMAIL VERIFICATION
// =====================================================================

async function verifyEmail(req, res) {
    const token = String(req.query.token || '').trim();
    try {
        const { userId } = await AuthService.verifyEmailWithToken(token);
        // Aktif oturum varsa session'ı senkron et — banner hemen kaybolsun
        if (req.session && req.session.userId === userId) {
            req.session.emailVerifiedAt = new Date();
        }
        res.render('auth/verify-email-done', {
            title: 'E-posta doğrulandı',
            success: true,
            error: null,
        });
    } catch (err) {
        res.status(400).render('auth/verify-email-done', {
            title: 'Doğrulama başarısız',
            success: false,
            error: err.message,
        });
    }
}

async function resendVerification(req, res) {
    try {
        await AuthService.sendEmailVerification(req.session.userId);
    } catch (err) {
        console.error('[resend-verify] hata:', err.message);
    }
    const back = req.get('Referer') || '/dashboard';
    // Referer'e ?verifysent=1 ekle — layout script bunu görüp toast gösterir
    const sep = back.includes('?') ? '&' : '?';
    res.redirect(back + sep + 'verifysent=1');
}

module.exports = {
    showRegisterForm, register,
    showLoginForm, login, logout,
    showForgotForm, sendForgot,
    showResetForm, doReset,
    verifyEmail, resendVerification,
};
