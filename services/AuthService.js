const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const TokenService = require('./TokenService');
const MailService = require('./MailService');
const { TOKEN_TYPES } = require('../utils/constants');

const BCRYPT_COST = 10;

// =====================================================================
// LOGIN
// =====================================================================
async function login({email, password}) {
    if(!email || !password) {
        throw new Error('Email ve şifre zorunludur');
    }

    const user = await UserModel.findByEmail(email);

    if(!user) {
        throw new Error("Email veya şifre yanlış");
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if(!match) {
        throw new Error('Email veya şifre yanlış');
    }

    const {password_hash, ...safeUser} = user;
    return safeUser;
}

// =====================================================================
// PASSWORD RESET
// =====================================================================

/**
 * Kullanıcı "şifremi unuttum" formuna e-posta yazdı.
 * Kayıtlı ise: token üret, mail at.
 * Kayıtlı DEĞİLSE: sessizce başarı gibi davran (user enumeration'ı önle).
 * Çağıran her durumda "eğer bu adres varsa mail attık" mesajı gösterir.
 */
async function requestPasswordReset(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) return; // silent

    const user = await UserModel.findByEmail(clean);
    if (!user) return; // silent — attacker enum'ı yakalayamasın

    const { rawToken, expiresAt } = await TokenService.generateAndSave(
        user.id, TOKEN_TYPES.PASSWORD_RESET
    );

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const ttlText = '60 dakika';

    await MailService.send({
        to: user.email,
        subject: 'OKUD — Şifreni sıfırla',
        body:
            `Merhaba ${user.first_name},\n\n` +
            `Hesabın için şifre sıfırlama isteği aldık. Şu linke tıklayarak yeni şifreni belirleyebilirsin:\n\n` +
            `${link}\n\n` +
            `Link ${ttlText} içinde geçerlidir ve tek kullanımlıktır.\n\n` +
            `Bu isteği sen yapmadıysan bu maili yok sayabilirsin — şifren değişmez.\n\n` +
            `— OKUD`,
        html: mailShell({
            title: 'Şifreni sıfırla',
            greeting: `Merhaba ${escapeHtml(user.first_name)},`,
            body: `Hesabın için şifre sıfırlama isteği aldık. Aşağıdaki butona tıklayarak yeni şifreni belirleyebilirsin. Link <b>${ttlText}</b> içinde geçerlidir ve tek kullanımlıktır.`,
            ctaText: 'Şifremi sıfırla',
            ctaLink: link,
            footer: 'Bu isteği sen yapmadıysan bu maili yok sayabilirsin — şifren değişmez.',
        }),
    });
}

/**
 * Kullanıcı reset formundaki yeni şifreyi kaydediyor.
 * Token'ı consume et → şifreyi bcrypt'le → users tablosunda güncelle.
 */
async function resetPasswordWithToken(rawToken, newPassword, confirmPassword) {
    if (!newPassword || newPassword.length < 8) {
        throw new Error('Yeni şifre en az 8 karakter olmalı.');
    }
    if (newPassword !== confirmPassword) {
        throw new Error('Yeni şifre ile tekrarı eşleşmiyor.');
    }

    const { userId } = await TokenService.consume(rawToken, TOKEN_TYPES.PASSWORD_RESET);
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await UserModel.updatePasswordHash(userId, password_hash);
}

// =====================================================================
// EMAIL VERIFICATION
// =====================================================================

/**
 * Kullanıcı kayıt oldu ya da "doğrulama linkini tekrar gönder" dedi.
 * Zaten doğrulanmışsa: hiçbir şey yapma (idempotent, sessiz).
 * Aksi halde: token üret, mail at.
 */
async function sendEmailVerification(userId) {
    const user = await UserModel.findById(userId);
    if (!user) return;
    if (user.email_verified_at) return; // zaten doğrulanmış

    const { rawToken } = await TokenService.generateAndSave(
        user.id, TOKEN_TYPES.EMAIL_VERIFICATION
    );

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

    await MailService.send({
        to: user.email,
        subject: 'OKUD — E-posta adresini doğrula',
        body:
            `Merhaba ${user.first_name},\n\n` +
            `OKUD hesabına hoş geldin! E-posta adresini doğrulamak için şu linke tıkla:\n\n` +
            `${link}\n\n` +
            `Link 48 saat içinde geçerlidir.\n\n` +
            `— OKUD`,
        html: mailShell({
            title: 'E-posta adresini doğrula',
            greeting: `Merhaba ${escapeHtml(user.first_name)},`,
            body: `OKUD'a hoş geldin! E-posta adresini doğrulamak için aşağıdaki butona tıklaman yeterli. Link <b>48 saat</b> içinde geçerlidir.`,
            ctaText: 'E-postamı doğrula',
            ctaLink: link,
            footer: 'Bu maili beklemiyorsan yok sayabilirsin.',
        }),
    });
}

/**
 * Kullanıcı verify linkine tıkladı.
 * Token'ı consume et → users.email_verified_at = NOW.
 */
async function verifyEmailWithToken(rawToken) {
    const { userId } = await TokenService.consume(rawToken, TOKEN_TYPES.EMAIL_VERIFICATION);
    await UserModel.setEmailVerified(userId);
    return { userId };
}

// =====================================================================
// Yardımcılar — mail HTML şablonu
// =====================================================================
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function mailShell({ title, greeting, body, ctaText, ctaLink, footer }) {
    return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#F5F5F3; font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:520px; margin:0 auto; padding:32px 24px;">
    <div style="background:white; border-radius:14px; padding:32px 28px; box-shadow:0 1px 3px rgba(15,42,74,0.06);">
      <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:24px;">
        <span style="position:relative; display:inline-block; width:32px; height:32px; background:#0F2A4A; border-radius:9px; color:white; text-align:center; line-height:32px; font-weight:800; font-size:14px;">O</span>
        <span style="font-weight:700; font-size:16px; color:#0F2A4A; letter-spacing:-0.02em;">OKUD</span>
      </div>
      <h1 style="font-size:20px; color:#0F172A; margin:0 0 16px; letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
      <p style="font-size:14px; color:#475569; margin:0 0 8px;">${greeting}</p>
      <p style="font-size:14px; color:#475569; line-height:1.6; margin:0 0 24px;">${body}</p>
      <a href="${ctaLink}" style="display:inline-block; background:#0F2A4A; color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">${escapeHtml(ctaText)}</a>
      <p style="font-size:12px; color:#94A3B8; margin:24px 0 0; line-height:1.6;">Butona tıklayamıyorsan bu linki tarayıcına kopyala:<br><a href="${ctaLink}" style="color:#0F2A4A; word-break:break-all;">${ctaLink}</a></p>
      <hr style="border:none; border-top:1px solid #E5E7EB; margin:24px 0;">
      <p style="font-size:12px; color:#94A3B8; margin:0;">${footer}</p>
    </div>
    <p style="text-align:center; font-size:11px; color:#94A3B8; margin:16px 0 0;">OKUD · Kurumsal Ulaşım ve Belge Denetim</p>
  </div>
</body></html>`;
}

// =====================================================================
// Profil düzenleme (mevcut UserService fonksiyonları burada değil,
//   sadece login + auth-related buradan çıkıyor)
// =====================================================================

module.exports = {
    login,
    requestPasswordReset,
    resetPasswordWithToken,
    sendEmailVerification,
    verifyEmailWithToken,
};
