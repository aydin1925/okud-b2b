const AdminCompanyApprovalService = require('../../services/AdminCompanyApprovalService');

async function showHub(req, res) {
  const counts = await AdminCompanyApprovalService.getPendingCounts();
  res.render('admin/index', {
    title: 'Admin Panel',
    counts,
  });
}

module.exports = { showHub };
