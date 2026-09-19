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

async function showCreateForm(req, res) {
  const company = res.locals.currentCompany;
  const targetType = PartnershipInvitationService.oppositeType(company.company_type);
  const fleet = await PartnershipInvitationService.getFleetForInvitation(
    company.id, company.company_type
  );
  res.render('partnerships/invitations/create', {
    title: 'Yeni İş Ortaklığı Daveti',
    error: null,
    formData: {},
    targetType,
    targetTypeLabel: TARGET_TYPE_LABELS[targetType] || '—',
    fleet,
    selectedDriverIds:  new Set(),
    selectedVehicleIds: new Set(),
  });
}

async function create(req, res) {
  const company = res.locals.currentCompany;
  const toArr = (v) => v == null ? [] : (Array.isArray(v) ? v : [v]);
  const driverIds  = toArr(req.body.driver_ids);
  const vehicleIds = toArr(req.body.vehicle_ids);

  try {
    const result = await PartnershipInvitationService.create(
      { label: req.body.label, driverIds, vehicleIds },
      { companyId: company.id, userId: req.session.userId, ipAddress: req.ip }
    );
    res.render('partnerships/invitations/created', {
      title: 'Davet Kodu Oluşturuldu',
      result,
      targetTypeLabels: TARGET_TYPE_LABELS,
    });
  } catch (err) {
    const targetType = PartnershipInvitationService.oppositeType(company.company_type);
    const fleet = await PartnershipInvitationService.getFleetForInvitation(
      company.id, company.company_type
    );
    // Kullanıcının form'daki seçimini geri koyabilmek için Set'e çevir.
    const asIntSet = (arr) => new Set(arr.map(x => parseInt(x, 10)).filter(Number.isFinite));
    res.status(400).render('partnerships/invitations/create', {
      title: 'Yeni İş Ortaklığı Daveti',
      error: err.message,
      formData: req.body,
      targetType,
      targetTypeLabel: TARGET_TYPE_LABELS[targetType] || '—',
      fleet,
      selectedDriverIds:  asIntSet(driverIds),
      selectedVehicleIds: asIntSet(vehicleIds),
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
