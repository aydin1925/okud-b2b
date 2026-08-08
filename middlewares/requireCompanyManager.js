const { MANAGER_ROLE_NAMES } = require('../utils/constants');

// currentCompany middleware'inin ardından çalışır.
// Aktif çalışma alanı seçili + kullanıcının o kurumdaki rolü yönetici mi kontrol eder.
function requireCompanyManager(req, res, next) {
  const company = res.locals.currentCompany;

  if (!company) {
    return res.status(400).send(
      'Bu işlem için önce bir çalışma alanı (kurum) seçmelisin. <a href="/dashboard">Dashboard</a>'
    );
  }

  if (!MANAGER_ROLE_NAMES.includes(company.role.name)) {
    return res.status(403).send('Bu işlem için kurum yöneticisi olman gerekiyor.');
  }

  next();
}

module.exports = requireCompanyManager;
