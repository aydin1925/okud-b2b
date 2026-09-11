const verify = require('../utils/jwt');

// Authorization: Bearer <token>
// Bulunamazsa ya da doğrulanamazsa 401 döndürür
// Geçerliyse payload'ı req.user'a koyar.

function apiAuth(req, res, next) {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');

    if(scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            error: {message: 'Yetkilendirme başlığı eksik ya da geçersiz', code: 'AUTH_HEADER_MISSING'}
        });
    }

    try {
        const payload = verify(token);
        req.user = {id: payload.sub, email: payload.email};
        next();
    }
    catch (err) {
        return res.status(401).json({
            error: {message: 'Geçersiz veya süresi dolmuş token', code: 'AUTH_INVALID_TOKEN'}
        });
    }
}

module.exports = apiAuth;