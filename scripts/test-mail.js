// scripts/test-mail.js — SMTP config sağlığı + gerçek bir mail deneme
// Kullanım:  node scripts/test-mail.js aydinsahin1925@gmail.com
require('dotenv').config();
const MailService = require('../services/MailService');

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Kullanım: node scripts/test-mail.js <alici@ornek.com>');
    process.exit(1);
  }

  console.log('SMTP config kontrol ediliyor…');
  const v = await MailService.verify();
  if (!v.ok) {
    console.error('❌ SMTP bağlantı başarısız:', v.reason);
    process.exit(1);
  }
  console.log('✅ SMTP bağlantısı OK. Test maili gönderiliyor →', to);

  const at = await MailService.send({
    to,
    subject: 'OKUD test — SMTP çalışıyor',
    body:
      'Bu bir test mailidir.\n\n' +
      'Eğer bu maili görüyorsan Brevo SMTP kurulumu düzgün çalışıyor.\n\n' +
      '— OKUD',
    html:
      '<div style="font-family:Inter,system-ui,sans-serif; max-width:520px; margin:0 auto; padding:24px;">' +
      '<h2 style="color:#0F2A4A; margin:0 0 10px;">SMTP kurulumu çalışıyor 🎉</h2>' +
      '<p style="color:#475569; line-height:1.6;">Bu bir test mailidir. Brevo üzerinden başarıyla gönderildi.</p>' +
      '<p style="font-size:12px; color:#94A3B8; margin-top:24px;">— OKUD</p>' +
      '</div>',
  });

  if (at) {
    console.log('✅ Mail gönderildi:', at.toISOString());
    console.log('   Spam kutusuna düşme ihtimali var — orayı da kontrol et.');
  } else {
    console.error('❌ Mail gönderilemedi (log yukarıda).');
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
