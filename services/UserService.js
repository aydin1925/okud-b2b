const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const { assertStrongPassword } = require('../utils/password');

const BCRYPT_COST = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register({first_name, last_name, email, password}) {
    // 1. Doğrulama
    if(!first_name || !last_name || !email || !password) {
        throw new Error("Tüm alanların doldurulması zorunludur.");
    }
    assertStrongPassword(password);

    // email tekilliği — ENUMERATION KORUMASI:
    // "zaten kayıtlı" hatası fırlatmıyoruz (bu, saldırgana e-postanın sistemde
    // olduğunu doğrular). Bunun yerine sessizce { duplicate: true } dönüyoruz;
    // controller her iki durumda da AYNI başarı ekranını gösterir.
    const existing = await UserModel.findByEmail(email);
    if(existing) {
        return { duplicate: true, email };
    }

    // Şifre hashleme
    const password_hash = await bcrypt.hash(password, BCRYPT_COST);

    // Kullanıcıyı oluştur
    const userId = await UserModel.create({
        first_name,
        last_name,
        email,
        password_hash
    });

    return {id: userId, email, duplicate: false};
}

// ============================================================
// Profil düzenleme
// ============================================================

async function updateName(userId, first_name, last_name) {
    const fn = String(first_name || '').trim();
    const ln = String(last_name  || '').trim();
    if (!fn || !ln) throw new Error('Ad ve soyad boş olamaz.');
    if (fn.length > 100 || ln.length > 100) throw new Error('Ad veya soyad çok uzun.');

    await UserModel.updateName(userId, fn, ln);
    return { first_name: fn, last_name: ln };
}

async function changeEmail(userId, newEmail, currentPassword) {
    const email = String(newEmail || '').trim().toLowerCase();
    if (!email)            throw new Error('Yeni e-posta boş olamaz.');
    if (!EMAIL_RE.test(email)) throw new Error('Geçerli bir e-posta adresi gir.');
    if (!currentPassword)  throw new Error('Değişikliği onaylamak için mevcut şifreni gir.');

    // Mevcut şifre doğrulaması
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('Kullanıcı bulunamadı.');
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) throw new Error('Mevcut şifre yanlış.');

    // Aynı e-postaya güncelleme = no-op ama net bir mesaj daha iyi
    if (user.email === email) throw new Error('Yeni e-posta mevcut olanla aynı.');

    // Tekillik: başka birine aitse reddet
    const other = await UserModel.findByEmail(email);
    if (other && other.id !== userId) throw new Error('Bu e-posta başka bir hesapta kullanılıyor.');

    try {
        await UserModel.updateEmail(userId, email);
    } catch (err) {
        // Yarış durumu (aynı anda başkası aldı) yakalaması
        if (err && err.code === 'ER_DUP_ENTRY') {
            throw new Error('Bu e-posta başka bir hesapta kullanılıyor.');
        }
        throw err;
    }
    return { email };
}

async function changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword) throw new Error('Mevcut şifreni gir.');
    if (!newPassword || newPassword.length < 8) {
        throw new Error('Yeni şifre en az 8 karakter olmalı.');
    }
    if (currentPassword === newPassword) {
        throw new Error('Yeni şifre mevcut şifreyle aynı olamaz.');
    }

    const user = await UserModel.findById(userId);
    if (!user) throw new Error('Kullanıcı bulunamadı.');
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) throw new Error('Mevcut şifre yanlış.');

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await UserModel.updatePasswordHash(userId, password_hash);
}

module.exports = { register, updateName, changeEmail, changePassword };
