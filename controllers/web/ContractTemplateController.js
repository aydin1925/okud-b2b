const ContractTemplateService = require('../../services/ContractTemplateService');
const { CONTRACT_TYPE_LABELS, CONTRACT_TYPES } = require('../../utils/constants');

const VALID_TYPES = Object.values(CONTRACT_TYPES);

async function showList(req, res) {
  const templates = await ContractTemplateService.listForCompany(res.locals.currentCompany.id);
  res.render('contracts/list', {
    title: 'Sözleşmelerim',
    templates,
    typeLabels: CONTRACT_TYPE_LABELS,
  });
}

async function showEdit(req, res) {
  const type = req.params.type;
  if (!VALID_TYPES.includes(type)) {
    return res.status(404).send('Bilinmeyen sözleşme türü.');
  }
  const template = await ContractTemplateService.getEffective(res.locals.currentCompany.id, type);
  res.render('contracts/edit', {
    title: `${CONTRACT_TYPE_LABELS[type]} — Düzenle`,
    template,
    typeLabels: CONTRACT_TYPE_LABELS,
    error: null,
    formData: { title: template.title, content: template.content },
  });
}

async function update(req, res) {
  const type = req.params.type;
  if (!VALID_TYPES.includes(type)) {
    return res.status(404).send('Bilinmeyen sözleşme türü.');
  }
  try {
    await ContractTemplateService.save(res.locals.currentCompany.id, type, {
      title: req.body.title,
      content: req.body.content,
    });
    res.redirect('/company/contracts');
  } catch (err) {
    const template = await ContractTemplateService.getEffective(res.locals.currentCompany.id, type);
    res.status(400).render('contracts/edit', {
      title: `${CONTRACT_TYPE_LABELS[type]} — Düzenle`,
      template,
      typeLabels: CONTRACT_TYPE_LABELS,
      error: err.message,
      formData: { title: req.body.title, content: req.body.content },
    });
  }
}

async function reset(req, res) {
  const type = req.params.type;
  if (!VALID_TYPES.includes(type)) {
    return res.status(404).send('Bilinmeyen sözleşme türü.');
  }
  await ContractTemplateService.resetToDefault(res.locals.currentCompany.id, type);
  res.redirect('/company/contracts');
}

module.exports = { showList, showEdit, update, reset };
