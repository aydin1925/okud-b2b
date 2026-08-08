const { ADMIN_ROLE_NAMES } = require('../utils/constants');

// currentCompany middleware'inin ardından çalışır.
// Aktif çalışma alanı + kullanıcının orada sadece company_admin olması şart.
// requireCompanyManager'dan daha sıkı: moderator geçemez.
function requireCompanyAdmin(req, res, next) {
  const company = res.locals.currentCompany;

  if (!company) {
    return res.status(400).send(
      'Bu işlem için önce bir çalışma alanı (kurum) seçmelisin. <a href="/dashboard">Dashboard</a>'
    );
  }

  if (!ADMIN_ROLE_NAMES.includes(company.role.name)) {
    return res.status(403).send('Bu işlem için kurum yöneticisi (admin) olman gerekiyor.');
  }

  next();
}

module.exports = requireCompanyAdmin;
