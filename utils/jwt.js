const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if(!SECRET) {
    throw new Error('JWT_SECRET .env dosyasında tanımlı değil')
}

function sign(payload) {
    return jwt.sign(payload, SECRET, {expiresIn: EXPIRES_IN});
}

function verify(token) {
    // Geçersiz/süresi dolmuş token'da JsonWebTokenError/TokenExpiredError fırlar
    return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };