const UserService = require('../../services/UserService');
const AuthService = require('../../services/AuthService');
const AuditService = require('../../services/AuditService');
const { AUDIT_ACTIONS } = require('../../utils/constants');

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
        const submittedEmail = String(req.body.email || '').trim();

        if (user.duplicate) {
            // Enumeration koruması: e-posta zaten kayıtlı ama BUNU AÇIK ETME.
            // Var olan adrese "birileri seninle kayıt denedi" bilgisi gönder (best-effort),
            // kullanıcıya ise normal kayıttakiyle AYNI mesajı göster.
            try {
                await AuthService.sendDuplicateRegisterNotice(submittedEmail);
            } catch (mailErr) {
                console.error('[register] duplicate notice atılamadı:', mailErr.message);
            }
        } else {
            AuditService.log({
                actorUserId: user.id,
                action: AUDIT_ACTIONS.AUTH_REGISTER,
                entityType: 'user',
                entityId: user.id,
                metadata: { email: user.email },
                ipAddress: req.ip,
            });
            // Doğrulama linkini sessizce gönder. Mail patlarsa akış kesilmesin.
            try {
                await AuthService.sendEmailVerification(user.id);
            } catch (mailErr) {
                console.error('[register] verification mail atılamadı:', mailErr.message);
            }
        }

        res.render('auth/register', {
            title: 'Kayıt Ol',
            error: null,
            success: `Kayıt alındı. Eğer ${submittedEmail} kullanılabilir bir adresse, doğrulama maili gönderildi.`,
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
        const user = await AuthService.login(req.body, req.ip);

        // Session fixation savunması: giriş başarısında session id'yi YENİLE.
        // Böylece login öncesi (belki saldırgan tarafından sabitlenmiş) session id
        // geçersiz olur; kullanıcı taze, yalnız kendisinin bildiği bir id ile devam eder.
        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).render('auth/login', {
                    title: 'Giriş Yap', error: 'Oturum başlatılamadı, tekrar deneyin.',
                    info: null, formData: { email: req.body.email },
                });
            }
            req.session.userId = user.id;
            req.session.userEmail = user.email;
            req.session.userName = `${user.first_name} ${user.last_name}`;
            req.session.isSuperadmin = !!user.is_superadmin;
            req.session.emailVerifiedAt = user.email_verified_at || null;
            // Store'a yazılmadan redirect etmeyelim (aksi halde ilk istek session'sız gelebilir)
            req.session.save(() => res.redirect('/dashboard'));
        });
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
            token, req.body.new_password, req.body.new_password_confirm, req.ip
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
        const { userId } = await AuthService.verifyEmailWithToken(token, req.ip);
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
