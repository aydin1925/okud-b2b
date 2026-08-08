const CompanyPartnershipService = require('../../services/CompanyPartnershipService');

const TYPE_LABEL = { provider: 'Hizmet Sağlayıcı', receiver: 'Hizmet Alan' };

async function showList(req, res) {
  const partnerships = await CompanyPartnershipService.listActiveForCompany(
    res.locals.currentCompany.id
  );
  res.render('partnerships/list', {
    title: 'İş Birliklerim',
    partnerships,
    typeLabels: TYPE_LABEL,
  });
}

async function showDetail(req, res) {
  try {
    const detail = await CompanyPartnershipService.getDetail(
      res.locals.currentCompany.id,
      parseInt(req.params.id, 10)
    );
    res.render('partnerships/detail', {
      title: 'İş Ortaklığı Detayı',
      detail,
      typeLabels: TYPE_LABEL,
    });
  } catch (err) {
    res.status(403).send(
      `Erişim hatası: ${err.message}. <a href="/company/partnerships">İş Birliklerim</a>`
    );
  }
}

async function terminate(req, res) {
  try {
    await CompanyPartnershipService.terminate(
      parseInt(req.params.id, 10),
      res.locals.currentCompany.id,
      req.session.userId
    );
    res.redirect('/company/partnerships');
  } catch (err) {
    res.status(400).send(
      `Fesih hatası: ${err.message}. <a href="/company/partnerships">İş Birliklerim</a>`
    );
  }
}

module.exports = { showList, showDetail, terminate };
