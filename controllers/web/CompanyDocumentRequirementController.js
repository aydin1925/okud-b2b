const CompanyDocumentRequirementService = require('../../services/CompanyDocumentRequirementService');
const {
  DRIVER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  HOSTESS_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  OWNER_TYPES,
} = require('../../utils/constants');

async function showForm(req, res) {
  const companyId = res.locals.currentCompany.id;
  const requirements = await CompanyDocumentRequirementService.getRequirements(companyId);

  // View için hazır: her hedef tipinin katalog + o kurumun seçili slug'ları
  const catalog = {
    [OWNER_TYPES.DRIVER_PROFILE]:  DRIVER_DOCUMENT_TYPES,
    [OWNER_TYPES.VEHICLE_PROFILE]: VEHICLE_DOCUMENT_TYPES,
    [OWNER_TYPES.HOSTESS_PROFILE]: HOSTESS_DOCUMENT_TYPES,
  };

  res.render('company/document_requirements', {
    title: 'Belge Gereksinimleri',
    catalog,
    labels: DOCUMENT_TYPE_LABELS,
    requirements,
    flash: req.query.flash || null,
  });
}

async function save(req, res) {
  try {
    const companyId  = res.locals.currentCompany.id;
    const targetType = req.body.target_type;
    // Checkbox listesi: seçilen slug'lar (isim = document_types[])
    const documentTypes = req.body.document_types || [];

    await CompanyDocumentRequirementService.saveRequirements(
      companyId, targetType, documentTypes
    );

    res.redirect(`/company/document-requirements?flash=saved-${targetType}`);
  } catch (err) {
    res.status(400).send(`Kaydetme hatası: ${err.message}. <a href="/company/document-requirements">Geri</a>`);
  }
}

module.exports = { showForm, save };
