const CompanyModel = require('../models/CompanyModel');
const DocumentModel = require('../models/DocumentModel');
const DriverProfileUpdateRequestModel = require('../models/DriverProfileUpdateRequestModel');
const VehicleProfileUpdateRequestModel = require('../models/VehicleProfileUpdateRequestModel');
const AuditService = require('./AuditService');
const { AUDIT_ACTIONS } = require('../utils/constants');

async function listPending() {
  return CompanyModel.findPendingApproval();
}

async function approve(companyId, actorUserId, ipAddress) {
  const affected = await CompanyModel.activate(companyId);
  if (!affected) throw new Error('Kurum bulunamadı veya zaten aktif');

  AuditService.log({
    actorUserId,
    companyId,
    action: AUDIT_ACTIONS.COMPANY_APPROVE,
    entityType: 'company',
    entityId: companyId,
    ipAddress,
  });
}

async function reject(companyId, reason, actorUserId, ipAddress) {
  if (!reason || !reason.trim()) throw new Error('Reddetme gerekçesi zorunludur');
  const company = await CompanyModel.findById(companyId);
  if (!company) throw new Error('Kurum bulunamadı');
  if (company.is_active) throw new Error('Bu kurum zaten aktif; reddetme geçersiz');
  const affected = await CompanyModel.softDelete(companyId);
  if (!affected) throw new Error('Kurum silinemedi');
  // NOT: gerekçe şimdilik konsola loglanır (ileride companies.rejection_reason kolonu eklenebilir)
  console.log(`[admin] company ${companyId} reddedildi. Gerekçe: ${reason.trim()}`);

  AuditService.log({
    actorUserId,
    companyId,
    action: AUDIT_ACTIONS.COMPANY_REJECT,
    entityType: 'company',
    entityId: companyId,
    metadata: { reason: reason.trim(), companyName: company.name },
    ipAddress,
  });
}

// Admin hub'da sayı gösterimi için toplu bekleyen sayıları
async function getPendingCounts() {
  const [pendingDocs, pendingCompanies, pendingDriverUpdates, pendingVehicleUpdates] = await Promise.all([
    DocumentModel.findAllPending(),
    CompanyModel.findPendingApproval(),
    DriverProfileUpdateRequestModel.findAllPendingDetailed(),
    VehicleProfileUpdateRequestModel.findAllPendingDetailed(),
  ]);
  return {
    documents: pendingDocs.length,
    companies: pendingCompanies.length,
    driverUpdates: pendingDriverUpdates.length,
    vehicleUpdates: pendingVehicleUpdates.length,
    total: pendingDocs.length + pendingCompanies.length + pendingDriverUpdates.length + pendingVehicleUpdates.length,
  };
}

module.exports = { listPending, approve, reject, getPendingCounts };
