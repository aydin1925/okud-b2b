// jobs/documentExpiryJob.js
const cron = require('node-cron');
const NotificationService = require('../services/NotificationService');

async function runScan() {
  console.log(`[cron] taramalar başladı: ${new Date().toISOString()}`);

  try {
    const docSummary = await NotificationService.scanDocumentExpiries();
    console.log('[cron] documentExpiry sonucu:', docSummary);
  } catch (err) {
    console.error('[cron] documentExpiry FATAL:', err);
  }

  try {
    const partnershipSummary = await NotificationService.scanPartnershipReadiness();
    console.log('[cron] partnershipReadiness sonucu:', partnershipSummary);
  } catch (err) {
    console.error('[cron] partnershipReadiness FATAL:', err);
  }
}

function register() {
  // Her gece Türkiye saatiyle 03:00
  cron.schedule('0 3 * * *', runScan, { timezone: 'Europe/Istanbul' });
  console.log('[cron] gece taramaları kaydedildi (her gece 03:00 Europe/Istanbul)');
}

module.exports = { register, runScan };
