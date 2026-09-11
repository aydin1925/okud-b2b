const AdminCompanyApprovalService = require('../../services/AdminCompanyApprovalService');
const DocumentService = require('../../services/DocumentService');
const AdminDriverUpdateService = require('../../services/AdminDriverUpdateService');
const AdminVehicleUpdateService = require('../../services/AdminVehicleUpdateService');
const { DOCUMENT_TYPE_LABELS } = require('../../utils/constants');

const VALID_TABS = ['documents', 'companies', 'driver-updates', 'vehicle-updates'];

// SuperAdmin onay merkezi: 4 kanalın bekleyenlerini tek sayfada listeler.
// Query ?tab=<kanal> aktif tab'ı belirler; default en fazla bekleyen kanal ya da 'documents'.
async function showApprovals(req, res) {
  const [documents, companies, driverUpdates, vehicleUpdates] = await Promise.all([
    DocumentService.listPending(),
    AdminCompanyApprovalService.listPending(),
    AdminDriverUpdateService.listPending(),
    AdminVehicleUpdateService.listPending(),
  ]);

  const tabParam = String(req.query.tab || '').toLowerCase();
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'documents';

  res.render('admin/approvals', {
    title: 'Onay Merkezi',
    breadcrumb: 'Onay Merkezi',
    layout: 'layouts/superadmin',
    documents,
    companies,
    driverUpdates,
    vehicleUpdates,
    activeTab,
    typeLabels: DOCUMENT_TYPE_LABELS,
    flash: req.query.msg ? { kind: req.query.err ? 'err' : 'ok', message: req.query.msg } : null,
  });
}

module.exports = { showApprovals };
