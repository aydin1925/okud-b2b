const PartnershipInvitationService = require('../../services/PartnershipInvitationService');

const TARGET_TYPE_LABELS = {
  provider: 'Hizmet Sağlayıcı (Kooperatif/Taşeron)',
  receiver: 'Hizmet Alan (Okul/Firma)',
};

async function showList(req, res) {
  const invitations = await PartnershipInvitationService.listPendingForCompany(
    res.locals.currentCompany.id
  );
  res.render('partnerships/invitations/list', {
    title: 'İş Ortaklığı Davetleri',
    invitations,
    targetTypeLabels: TARGET_TYPE_LABELS,
  });
}

function showCreateForm(req, res) {
  const targetType = PartnershipInvitationService.oppositeType(
    res.locals.currentCompany.company_type
  );
  res.render('partnerships/invitations/create', {
    title: 'Yeni İş Ortaklığı Daveti',
    error: null,
    formData: {},
    targetType,
    targetTypeLabel: TARGET_TYPE_LABELS[targetType] || '—',
  });
}

async function create(req, res) {
  try {
    const result = await PartnershipInvitationService.create(
      { label: req.body.label },
      { companyId: res.locals.currentCompany.id, userId: req.session.userId }
    );
    res.render('partnerships/invitations/created', {
      title: 'Davet Kodu Oluşturuldu',
      result,
      targetTypeLabels: TARGET_TYPE_LABELS,
    });
  } catch (err) {
    const targetType = PartnershipInvitationService.oppositeType(
      res.locals.currentCompany.company_type
    );
    res.status(400).render('partnerships/invitations/create', {
      title: 'Yeni İş Ortaklığı Daveti',
      error: err.message,
      formData: req.body,
      targetType,
      targetTypeLabel: TARGET_TYPE_LABELS[targetType] || '—',
    });
  }
}

async function cancel(req, res) {
  try {
    await PartnershipInvitationService.cancel(parseInt(req.params.id, 10), {
      companyId: res.locals.currentCompany.id,
    });
    res.redirect('/company/partnerships/invitations');
  } catch (err) {
    res.status(400).send(
      `İptal hatası: ${err.message}. <a href="/company/partnerships/invitations">Geri dön</a>`
    );
  }
}

module.exports = { showList, showCreateForm, create, cancel };
