const CompanyService = require('../../services/CompanyService');

async function showDashboard(req, res) {
  const companies = await CompanyService.listForUser(req.session.userId);
  res.render('dashboard/index', {
    title: 'Dashboard',
    companies,
  });
}

module.exports = { showDashboard };
