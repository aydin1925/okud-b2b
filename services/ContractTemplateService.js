const ContractTemplateModel = require('../models/ContractTemplateModel');
const {
  CONTRACT_TYPES,
  DEFAULT_CONTRACT_TEMPLATES,
  CONTRACT_TITLE_MAX,
  CONTRACT_CONTENT_MAX,
} = require('../utils/constants');

const VALID_TYPES = Object.values(CONTRACT_TYPES);

// Kurumun etkin (kendi ya da default) şablonunu döner.
async function getEffective(companyId, contractType) {
  if (!VALID_TYPES.includes(contractType)) {
    throw new Error('Geçersiz sözleşme türü');
  }

  const custom = await ContractTemplateModel.findByCompanyAndType(companyId, contractType);
  if (custom) {
    return {
      id: custom.id,
      type: contractType,
      title: custom.title,
      content: custom.content,
      source: 'custom',
      updated_at: custom.updated_at,
    };
  }

  const def = DEFAULT_CONTRACT_TEMPLATES[contractType];
  return {
    id: null,
    type: contractType,
    title: def.title,
    content: def.content,
    source: 'default',
    updated_at: null,
  };
}

async function listForCompany(companyId) {
  const results = [];
  for (const type of VALID_TYPES) {
    results.push(await getEffective(companyId, type));
  }
  return results;
}

async function save(companyId, contractType, { title, content }) {
  if (!VALID_TYPES.includes(contractType)) {
    throw new Error('Geçersiz sözleşme türü');
  }

  const cleanTitle = (title || '').trim();
  const cleanContent = (content || '').trim();

  if (!cleanTitle)   throw new Error('Sözleşme başlığı zorunlu');
  if (!cleanContent) throw new Error('Sözleşme metni zorunlu');
  if (cleanTitle.length > CONTRACT_TITLE_MAX) {
    throw new Error(`Başlık en fazla ${CONTRACT_TITLE_MAX} karakter olabilir`);
  }
  if (cleanContent.length > CONTRACT_CONTENT_MAX) {
    throw new Error(`Metin en fazla ${CONTRACT_CONTENT_MAX} karakter olabilir`);
  }

  await ContractTemplateModel.upsert({
    company_id: companyId,
    contract_type: contractType,
    title: cleanTitle,
    content: cleanContent,
  });
}

async function resetToDefault(companyId, contractType) {
  if (!VALID_TYPES.includes(contractType)) {
    throw new Error('Geçersiz sözleşme türü');
  }
  await ContractTemplateModel.remove(companyId, contractType);
}

module.exports = { getEffective, listForCompany, save, resetToDefault };
