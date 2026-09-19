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
    // Ham HTML basmak yerine (reflected-XSS/enjeksiyon riski) güvenli yönlendirme.
    // Yetkisiz kurum değişimi zaten olmadı; kullanıcı dashboard'a döner.
    res.redirect('/dashboard?err=company-switch');
  }
}

function clearCurrentCompany(req, res) {
  req.session.currentCompanyId = null;
  res.redirect('/dashboard');
}

// Filo üyesi için kurum ilişkisinin salt-okunur özet sayfası.
// Yönetici de girebilir ama current company'yi değiştirmez — sadece görsel.
async function showRelationship(req, res) {
  const companyId = parseInt(req.params.id, 10);
  if (!companyId) return res.redirect('/dashboard');

  try {
    const rel = await CompanyService.getRelationshipForUser(req.session.userId, companyId);
    res.render('companies/relationship', {
      title: rel.company.name,
      rel,
    });
  } catch (err) {
    // İlişki yok / kurum yok — dashboard'a döndür
    res.redirect('/dashboard');
  }
}

module.exports = { showCreateForm, create, switchCompany, clearCurrentCompany, showRelationship };
