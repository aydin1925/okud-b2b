const ConnectionRequestService = require('../../services/ConnectionRequestService');
const { TARGET_TYPE_LABELS } = require('../../utils/constants');

async function showList(req, res) {
  const requests = await ConnectionRequestService.listPendingForCompany(
    res.locals.currentCompany.id
  );
  res.render('connections/list', {
    title: 'Filo Davetleri',
    requests,
    typeLabels: TARGET_TYPE_LABELS,
  });
}

function showCreateForm(req, res) {
  res.render('connections/create', {
    title: 'Yeni Davet Kodu',
    error: null,
    formData: {},
  });
}

async function create(req, res) {
  try {
    const result = await ConnectionRequestService.create(
      { target_type: req.body.target_type, label: req.body.label },
      { companyId: res.locals.currentCompany.id, userId: req.session.userId }
    );
    res.render('connections/created', {
      title: 'Davet Kodu Oluşturuldu',
      result,
      typeLabels: TARGET_TYPE_LABELS,
    });
  } catch (err) {
    res.status(400).render('connections/create', {
      title: 'Yeni Davet Kodu',
      error: err.message,
      formData: req.body,
    });
  }
}

async function cancel(req, res) {
  try {
    await ConnectionRequestService.cancel(parseInt(req.params.id, 10), {
      companyId: res.locals.currentCompany.id,
    });
    res.redirect('/company/connections');
  } catch (err) {
    res.status(400).send(`İptal hatası: ${err.message}. <a href="/company/connections">Geri dön</a>`);
  }
}

module.exports = { showList, showCreateForm, create, cancel };
