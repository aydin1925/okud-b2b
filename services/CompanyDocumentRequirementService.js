const CompanyDocumentRequirementModel = require('../models/CompanyDocumentRequirementModel');
const {
  DRIVER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  HOSTESS_DOCUMENT_TYPES,
  OWNER_TYPES,
} = require('../utils/constants');

// Her hedef tipinin izin verilen belge kataloğu — validasyon için
const ALLOWED_BY_TARGET = {
  [OWNER_TYPES.DRIVER_PROFILE]:  DRIVER_DOCUMENT_TYPES,
  [OWNER_TYPES.VEHICLE_PROFILE]: VEHICLE_DOCUMENT_TYPES,
  [OWNER_TYPES.HOSTESS_PROFILE]: HOSTESS_DOCUMENT_TYPES,
};

/**
 * Kurumun tüm gereksinimlerini 3 target'a grupla döndür.
 * Boş liste bile olsa hep 3 anahtarlı obje döner.
 */
async function getRequirements(companyId) {
  const rows = await CompanyDocumentRequirementModel.findByCompany(companyId);
  const grouped = {
    [OWNER_TYPES.DRIVER_PROFILE]:  [],
    [OWNER_TYPES.VEHICLE_PROFILE]: [],
    [OWNER_TYPES.HOSTESS_PROFILE]: [],
  };
  for (const r of rows) {
    grouped[r.target_type].push(r.document_type);
  }
  return grouped;
}

/**
 * Bir hedef için gereksinim listesini komple değiştir.
 *  - target_type geçerli mi
 *  - liste geçerli slug'lardan mı (o hedef için izinli katalogda mı)
 *  - tekrar eden slug'ları temizle
 */
async function saveRequirements(companyId, targetType, documentTypes) {
  const allowed = ALLOWED_BY_TARGET[targetType];
  if (!allowed) {
    throw new Error(`Geçersiz hedef tipi: ${targetType}`);
  }

  // Array değilse boş sayıyoruz (form'dan tek değer geldiğinde string olabilir)
  let list = Array.isArray(documentTypes) ? documentTypes : (documentTypes ? [documentTypes] : []);

  // Tekrar temizle + geçersiz slug'ları at
  list = [...new Set(list)].filter(t => allowed.includes(t));

  await CompanyDocumentRequirementModel.replaceBulk(companyId, targetType, list);
  return { targetType, count: list.length };
}

module.exports = { getRequirements, saveRequirements };
