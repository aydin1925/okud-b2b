const AdminStatsModel = require('../models/AdminStatsModel');
const AuditLogModel = require('../models/AuditLogModel');
const { AUDIT_ACTION_LABELS } = require('../utils/constants');

// Türkçe binlik ayraç: 1847 -> "1.847"
function tr(n) {
  return Number(n || 0).toLocaleString('tr-TR');
}

// created_at ('YYYY-MM-DD HH:MM:SS', +03:00) -> "HH:MM"
function hhmm(s) {
  const m = String(s || '').match(/\d{2}:\d{2}/);
  return m ? m[0] : '';
}

// Göreli zaman: "5dk", "3sa", "2g"
function ago(s) {
  const t = new Date(String(s || '').replace(' ', 'T'));
  if (isNaN(t)) return '';
  const diffMin = Math.max(0, Math.floor((Date.now() - t.getTime()) / 60000));
  if (diffMin < 60) return diffMin + 'dk';
  const h = Math.floor(diffMin / 60);
  if (h < 24) return h + 'sa';
  return Math.floor(h / 24) + 'g';
}

// Eylem türüne göre renk sınıfı (aktivite listesi noktası)
function kind(action) {
  const a = String(action || '');
  if (a.endsWith('.reject')) return 'bad';
  if (/\.(verify|approve|redeem|join|resume|email_verify)$/.test(a)) return 'good';
  return 'info';
}

// Büyüme yüzdesi: bu ay vs geçen ay
function growthPct(thisMonth, lastMonth) {
  const t = Number(thisMonth || 0), l = Number(lastMonth || 0);
  if (l === 0) return t > 0 ? 100 : 0;
  return Math.round(((t - l) / l) * 100);
}

/**
 * Dashboard'ın ihtiyaç duyduğu tüm gerçek verileri tek çağrıda toplar.
 * Hepsi paralel; view sadece hazır değerleri basar.
 */
async function getOverview() {
  const [company, user, document, partnership, decisions, activityRows] = await Promise.all([
    AdminStatsModel.companyStats(),
    AdminStatsModel.userStats(),
    AdminStatsModel.documentStats(),
    AdminStatsModel.partnershipStats(),
    AdminStatsModel.documentDecisionsLast24h(),
    AuditLogModel.search({ limit: 5, offset: 0 }),
  ]);

  const cThis = Number(company.newThisMonth || 0);
  const cLast = Number(company.newLastMonth || 0);

  const recentActivity = activityRows.map((r) => ({
    time: hhmm(r.created_at),
    title: AUDIT_ACTION_LABELS[r.action] || r.action,
    meta: [
      r.actor_user_id ? (r.actor_name || ('#' + r.actor_user_id)) : 'Sistem',
      r.company_name || null,
    ].filter(Boolean).join(' · '),
    ago: ago(r.created_at),
    kind: kind(r.action),
  }));

  return {
    // Metrik kartları
    metrics: {
      companies:    { value: tr(company.active),      delta: Number(company.newThisMonth || 0) },
      users:        { value: tr(user.total),          delta: Number(user.newThisWeek || 0) },
      documents:    { value: tr(document.total),      delta: Number(document.newToday || 0) },
      partnerships: { value: tr(partnership.active),   delta: Number(partnership.newThisMonth || 0) },
    },
    // Bugün gündemde
    growth: { pct: growthPct(cThis, cLast), thisMonth: cThis, lastMonth: cLast },
    last24h: {
      verified: Number(decisions.verified || 0),
      rejected: Number(decisions.rejected || 0),
    },
    // Bu ayın özeti (gerçek sayımlar)
    monthly: {
      newCompanies:    cThis,
      newPartnerships: Number(partnership.newThisMonth || 0),
      newDocuments:    Number(document.newThisMonth || 0),
      newUsers:        Number(user.newThisMonth || 0),
    },
    recentActivity,
  };
}

module.exports = { getOverview };
