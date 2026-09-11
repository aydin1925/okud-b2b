// controllers/web/NotificationController.js
const NotificationService = require('../../services/NotificationService');

const ALLOWED_FILTERS = ['all', 'personal', 'company', 'unread'];

function normalizeFilter(raw) {
  const v = String(raw || 'all');
  return ALLOWED_FILTERS.includes(v) ? v : 'all';
}

async function showList(req, res) {
  const filter = normalizeFilter(req.query.filter);

  const [notifications, counts] = await Promise.all([
    NotificationService.listForUser(req.session.userId, { filter }),
    NotificationService.countsForUser(req.session.userId),
  ]);

  res.render('notifications/list', {
    title: 'Bildirimlerim',
    notifications,
    counts,
    filter,
  });
}

async function markRead(req, res) {
  await NotificationService.markAsRead(parseInt(req.params.id, 10), req.session.userId);
  const back = req.get('Referer') || '/notifications';
  res.redirect(back);
}

async function markAllRead(req, res) {
  await NotificationService.markAllAsRead(req.session.userId);
  const back = req.get('Referer') || '/notifications';
  res.redirect(back);
}

async function deleteOne(req, res) {
  await NotificationService.deleteOne(parseInt(req.params.id, 10), req.session.userId);
  const back = req.get('Referer') || '/notifications';
  res.redirect(back);
}

async function deleteAll(req, res) {
  const filter = normalizeFilter(req.body.filter);
  await NotificationService.deleteAllForUser(req.session.userId, { filter });
  res.redirect(filter === 'all' ? '/notifications' : `/notifications?filter=${filter}`);
}

// Navbar bell popover için — son 5 bildirim + okunmamış sayaç JSON döner.
async function recentJson(req, res) {
  try {
    const items = await NotificationService.listForUser(req.session.userId, { limit: 5 });
    const counts = await NotificationService.countsForUser(req.session.userId);
    res.json({
      items: items.map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
        company_name: n.company_name || null,
        created_at: n.created_at,
        read_at: n.read_at,
      })),
      unreadCount: counts.unread,
    });
  } catch (err) {
    res.status(500).json({ error: 'Bildirimler yüklenemedi' });
  }
}

module.exports = { showList, markRead, markAllRead, deleteOne, deleteAll, recentJson };
