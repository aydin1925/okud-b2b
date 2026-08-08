const NotificationModel = require('../models/NotificationModel');

// currentUser middleware'inden sonra çalışır.
// Giriş yapmış kullanıcı için okunmamış bildirim sayısını her sayfaya taşır;
// navbar zili ve dashboard kartı bu değer üzerinden badge basar.
async function notificationBadge(req, res, next) {
  res.locals.notificationUnreadCount = 0;
  if (!req.session || !req.session.userId) return next();

  try {
    res.locals.notificationUnreadCount = await NotificationModel.countUnreadByUserId(req.session.userId);
  } catch (err) {
    // Bildirim sayısı UI süsüdür — sorguda patlarsak sayfayı yıkmayalım.
    console.error('[notificationBadge] sayaç okunamadı:', err.message);
  }
  next();
}

module.exports = notificationBadge;
