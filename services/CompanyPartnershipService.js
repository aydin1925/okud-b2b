const CompanyPartnershipModel = require('../models/CompanyPartnershipModel');
const ContractAcceptanceModel = require('../models/ContractAcceptanceModel');

// Kurumun aktif iş birlikleri — karşı taraf bilgisi türetilmiş şekilde UI'a hazır dizi.
async function listActiveForCompany(companyId) {
  const rows = await CompanyPartnershipModel.findActiveByCompany(companyId);

  return rows.map((r) => {
    // currentCompany hangi kolondaysa karşı taraf öbür kolondur
    const iAmProvider = r.provider_company_id === companyId;
    const counterparty = iAmProvider
      ? { id: r.receiver_company_id, name: r.receiver_name, type: r.receiver_type }
      : { id: r.provider_company_id, name: r.provider_name, type: r.provider_type };

    return {
      id: r.id,
      startedAt: r.started_at,
      myRole: iAmProvider ? 'provider' : 'receiver',
      counterparty,
    };
  });
}

// Ownership check + karşı taraf + sözleşme snapshot ile detay
async function getDetail(companyId, partnershipId) {
  const p = await CompanyPartnershipModel.findById(partnershipId);
  if (!p) throw new Error('İş ortaklığı bulunamadı');

  if (p.provider_company_id !== companyId && p.receiver_company_id !== companyId) {
    throw new Error('Bu iş ortaklığına erişim yetkin yok');
  }

  const iAmProvider = p.provider_company_id === companyId;
  const counterparty = iAmProvider
    ? { id: p.receiver_company_id, name: p.receiver_name, type: p.receiver_type }
    : { id: p.provider_company_id, name: p.provider_name, type: p.provider_type };

  const acceptance = await ContractAcceptanceModel.findByPartnership(partnershipId);

  return {
    id: p.id,
    startedAt: p.started_at,
    terminatedAt: p.terminated_at,
    isActive: !p.terminated_at,
    myRole: iAmProvider ? 'provider' : 'receiver',
    counterparty,
    acceptance,
  };
}

async function terminate(partnershipId, companyId, userId) {
  const p = await CompanyPartnershipModel.findById(partnershipId);
  if (!p) throw new Error('İş ortaklığı bulunamadı');

  if (p.provider_company_id !== companyId && p.receiver_company_id !== companyId) {
    throw new Error('Bu iş ortaklığını feshetme yetkin yok');
  }
  if (p.terminated_at) throw new Error('Bu iş ortaklığı zaten feshedilmiş');

  const affected = await CompanyPartnershipModel.terminate(partnershipId, userId);
  if (!affected) throw new Error('Fesih işlemi başarısız (belki eş zamanlı işlem)');
}

module.exports = { listActiveForCompany, getDetail, terminate };
