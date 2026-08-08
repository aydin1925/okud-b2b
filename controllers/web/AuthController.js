const UserService = require('../../services/UserService');
const AuthService = require('../../services/AuthService');

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
        res.render('auth/register', {
            title: 'Kayıt Ol',
            error: null,
            success: `Kayıt Başarılı! (${user.email})`,
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

function showLoginForm(req, res) {
    res.render('auth/login', {
        title: 'Giriş Yap',
        error: null,
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
        res.redirect('/dashboard')
    }
    catch(err) {
        res.status(400).render('auth/login', {
            title: 'Giriş Yap',
            error: err.message,
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


module.exports = {showRegisterForm, register, showLoginForm, login, logout};