// currentCompany middleware'inin ardından çalışır.
// Aktif kurum provider tipinde değilse 403 döner.
// Fleet OTP kodu üretme, ortaklık daveti üretme gibi sadece
// hizmet sağlayıcı kurumlara mahsus akışlar için.
function requireProviderCompany(req, res, next) {
  const company = res.locals.currentCompany;

  if (!company) {
    return res.status(400).send(
      'Bu işlem için önce bir çalışma alanı (kurum) seçmelisin. <a href="/dashboard">Dashboard</a>'
    );
  }

  if (company.company_type !== 'provider') {
    return res.status(403).send(
      'Bu özellik sadece hizmet sağlayıcı (provider) kurumlar içindir. <a href="/dashboard">Dashboard</a>'
    );
  }

  next();
}

module.exports = requireProviderCompany;
