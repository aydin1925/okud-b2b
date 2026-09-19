const AuditService = require('../../services/AuditService');
const { AUDIT_ACTION_LABELS } = require('../../utils/constants');

// SuperAdmin denetim izi görünümü. Salt-okunur, filtreli, sayfalı.
// Filtreler query'den gelir: ?action=&from=&to=&page=
async function showAudit(req, res) {
  const action = req.query.action && AUDIT_ACTION_LABELS[req.query.action]
    ? req.query.action
    : null;
  // Tarih inputları YYYY-MM-DD gelir; to'ya gün sonunu ekle ki o gün dahil olsun.
  const from = req.query.from ? `${req.query.from} 00:00:00` : null;
  const to   = req.query.to   ? `${req.query.to} 23:59:59`   : null;
  const page = parseInt(req.query.page, 10) || 1;

  const result = await AuditService.list({ action, from, to, page, perPage: 50 });

  res.render('admin/audit', {
    title: 'Denetim İzleri',
    breadcrumb: 'Denetim İzleri',
    layout: 'layouts/superadmin',
    result,
    actionLabels: AUDIT_ACTION_LABELS,
    filters: {
      action: req.query.action || '',
      from: req.query.from || '',
      to: req.query.to || '',
    },
  });
}

module.exports = { showAudit };
