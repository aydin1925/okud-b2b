// MailService.js
// SMTP üzerinden mail gönderimi. Config .env'den:
//   MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS, MAIL_FROM
// Env eksikse: dev fallback → console'a yazar (uygulama patlamasın).

const nodemailer = require('nodemailer');

let transporter = null;
let configWarned = false;

function isConfigured() {
  return !!(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
}

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: String(process.env.MAIL_SECURE).toLowerCase() === 'true', // 465 → true, 587 → false (STARTTLS)
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  return transporter;
}

// Bağlantı sağlığı — boot'ta veya /admin/mail-test benzeri debug uçlarında çağrılır.
async function verify() {
  if (!isConfigured()) return { ok: false, reason: 'not-configured' };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function send({ to, subject, body, html }) {
  // Env yoksa eski davranış: dev'de console'a yaz, hata verme
  if (!isConfigured()) {
    if (!configWarned) {
      console.warn('[MAIL] SMTP env eksik — dev fallback: console.log');
      configWarned = true;
    }
    console.log('------------------------');
    console.log('[MAIL] to:', to);
    console.log('[MAIL] subject:', subject);
    console.log('[MAIL] body:\n' + body);
    console.log('------------------------');
    return new Date();
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.MAIL_FROM || `"Filoskope" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text: body,
      html: html || undefined,
    });
    return new Date();
  } catch (err) {
    // Mail göndermek kritik değil — bildirim UI'de zaten görünür.
    // Sadece log'la, uygulama akışını kesme.
    console.error('[MAIL] gönderilemedi:', to, '·', err.message);
    return null;
  }
}

module.exports = { send, verify, isConfigured };
