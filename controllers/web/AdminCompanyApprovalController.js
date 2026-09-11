const AdminCompanyApprovalService = require('../../services/AdminCompanyApprovalService');

function backTo(req, fallback) {
  const ret = req.body && req.body._return;
  if (typeof ret === 'string' && ret.startsWith('/admin')) return ret;
  return fallback;
}

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
    res.redirect(backTo(req, '/admin/companies'));
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}. <a href="/admin/approvals">Geri</a>`);
  }
}

async function reject(req, res) {
  try {
    await AdminCompanyApprovalService.reject(parseInt(req.params.id, 10), req.body.reason);
    res.redirect(backTo(req, '/admin/companies'));
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}. <a href="/admin/approvals">Geri</a>`);
  }
}

module.exports = { showPending, approve, reject };
