const AdminDashboardService = require('../../services/AdminDashboardService');

// SuperAdmin ana kontrol paneli
// pendingCounts zaten adminLocals middleware'inde res.locals'a set ediliyor.
// stats: dashboard'ın gerçek sistem verileri (mock'ların yerini aldı).
async function showHub(req, res) {
  const stats = await AdminDashboardService.getOverview();
  res.render('admin/index', {
    title: 'Kontrol Paneli',
    breadcrumb: 'Kontrol Paneli',
    layout: 'layouts/superadmin',
    stats,
  });
}

// getPendingCounts'u başka bir yerden import etmek isteyen olursa dışa aç
module.exports = { showHub };
