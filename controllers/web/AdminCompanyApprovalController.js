const AdminCompanyApprovalService = require('../../services/AdminCompanyApprovalService');

async function showPending(req, res) {
  const companies = await AdminCompanyApprovalService.listPending();
  res.render('admin/companies/pending', {
    title: 'Kurum Onay Talepleri',
    companies,
  });
}

async function approve(req, res) {
  try {
    await AdminCompanyApprovalService.approve(parseInt(req.params.id, 10));
    res.redirect('/admin/companies');
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}. <a href="/admin/companies">Geri</a>`);
  }
}

async function reject(req, res) {
  try {
    await AdminCompanyApprovalService.reject(parseInt(req.params.id, 10), req.body.reason);
    res.redirect('/admin/companies');
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}. <a href="/admin/companies">Geri</a>`);
  }
}

module.exports = { showPending, approve, reject };
