// jobs/documentExpiryJob.js
const cron = require('node-cron');
const NotificationService = require('../services/NotificationService');

async function runScan() {
  console.log(`[cron] documentExpiry taraması başladı: ${new Date().toISOString()}`);
  try {
    const summary = await NotificationService.scanDocumentExpiries();
    console.log('[cron] documentExpiry sonucu:', summary);
  } catch (err) {
    console.error('[cron] documentExpiry FATAL:', err);
  }
}

function register() {
  // Her gece Türkiye saatiyle 03:00
  cron.schedule('0 3 * * *', runScan, { timezone: 'Europe/Istanbul' });
  console.log('[cron] documentExpiry kaydedildi (her gece 03:00 Europe/Istanbul)');
}

module.exports = { register, runScan };