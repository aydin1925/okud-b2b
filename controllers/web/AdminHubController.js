const AdminCompanyApprovalService = require('../../services/AdminCompanyApprovalService');

// SuperAdmin ana kontrol paneli
// pendingCounts zaten adminLocals middleware'inde res.locals'a set ediliyor,
// burada breadcrumb + layout seçimi yeterli.
async function showHub(req, res) {
  res.render('admin/index', {
    title: 'Kontrol Paneli',
    breadcrumb: 'Kontrol Paneli',
    layout: 'layouts/superadmin',
  });
}

// getPendingCounts'u başka bir yerden import etmek isteyen olursa dışa aç
module.exports = { showHub };
