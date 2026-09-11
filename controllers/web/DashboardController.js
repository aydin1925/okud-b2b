const DashboardService = require('../../services/DashboardService');

const COMPANY_TYPE_PROVIDER = 'provider';
const COMPANY_TYPE_RECEIVER = 'receiver';

/**
 * Dashboard 3 mod:
 *  - currentCompany yok           → personal.ejs (kişisel alan)
 *  - currentCompany + provider    → provider.ejs (kendi filo + ortaklıklar)
 *  - currentCompany + receiver    → receiver.ejs (sadece ortaklıklar)
 */
async function showDashboard(req, res) {
  const currentCompany = res.locals.currentCompany;

  // Mod 1: Kişisel — kurum aktif değil
  if (!currentCompany) {
    const data = await DashboardService.personalOverview(req.session.userId);
    return res.render('dashboard/personal', {
      title: 'Dashboard',
      companies: data.companies,
      vehicles: data.vehicles || [],
      driverProfile: data.driverProfile || null,
      hostesses: data.hostesses || [],
      documents: data.documents || [],
    });
  }

  // Mod 2: Provider — hizmet veren kurum
  if (currentCompany.company_type === COMPANY_TYPE_PROVIDER) {
    const data = await DashboardService.providerOverview(currentCompany.id);
    return res.render('dashboard/provider', {
      title: 'Dashboard',
      overview: data,
    });
  }

  // Mod 3: Receiver — hizmet alan kurum
  if (currentCompany.company_type === COMPANY_TYPE_RECEIVER) {
    const data = await DashboardService.receiverOverview(currentCompany.id);
    return res.render('dashboard/receiver', {
      title: 'Dashboard',
      overview: data,
    });
  }

  // Beklenmedik company_type — personal'a düş, hata verme
  const data = await DashboardService.personalOverview(req.session.userId);
  return res.render('dashboard/personal', {
    title: 'Dashboard',
    companies: data.companies,
  });
}

module.exports = { showDashboard };
