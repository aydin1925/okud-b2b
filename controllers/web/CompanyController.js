const CompanyService = require('../../services/CompanyService');

function showCreateForm(req, res) {
  res.render('companies/create', {
    title: 'Yeni Kurum',
    error: null,
    formData: {},
  });
}

async function create(req, res) {
  try {
    await CompanyService.create(req.body, req.session.userId);
    res.redirect('/dashboard');
  } catch (err) {
    res.status(400).render('companies/create', {
      title: 'Yeni Kurum',
      error: err.message,
      formData: req.body,
    });
  }
}

async function switchCompany(req, res) {
  try {
    const companyId = parseInt(req.body.company_id, 10);
    if (!companyId) throw new Error('Geçersiz kurum');

    // Güvenlik: kullanıcı bu kuruma gerçekten üye mi?
    await CompanyService.getMembership(req.session.userId, companyId);

    req.session.currentCompanyId = companyId;
    res.redirect('/dashboard');
  } catch (err) {
    res.status(403).send(`Kurum değiştirilemedi: ${err.message}`);
  }
}

function clearCurrentCompany(req, res) {
  req.session.currentCompanyId = null;
  res.redirect('/dashboard');
}

module.exports = { showCreateForm, create, switchCompany, clearCurrentCompany };
