// currentCompany middleware'inin ardından çalışır.
// Aktif kurum receiver tipinde değilse 403 döner.
// (Belge gereksinim şablonu gibi sadece receiver'a anlamlı özellikler için.)
function requireReceiverCompany(req, res, next) {
  const company = res.locals.currentCompany;

  if (!company) {
    return res.status(400).send(
      'Bu işlem için önce bir çalışma alanı (kurum) seçmelisin. <a href="/dashboard">Dashboard</a>'
    );
  }

  if (company.company_type !== 'receiver') {
    return res.status(403).send(
      'Bu özellik sadece hizmet alan (receiver) kurumlar içindir. <a href="/dashboard">Dashboard</a>'
    );
  }

  next();
}

module.exports = requireReceiverCompany;
