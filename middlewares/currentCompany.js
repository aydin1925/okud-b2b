const CompanyService = require('../services/CompanyService');

async function currentCompany(req, res, next) {
  res.locals.currentCompany = null;

  const userId = req.session.userId;
  const companyId = req.session.currentCompanyId;

  if (!userId || !companyId) return next();

  try {
    const membership = await CompanyService.getMembership(userId, companyId);
    res.locals.currentCompany = {
      id: membership.id,
      name: membership.name,
      company_type: membership.company_type,
      is_active: !!membership.is_active,
      role: {
        id: membership.role_id,
        name: membership.role_name,
        display_name: membership.role_display_name,
      },
    };
  } catch (err) {
    // Kullanıcı bu kuruma artık üye değil (silinmiş vs.) — session'ı temizle
    req.session.currentCompanyId = null;
  }

  next();
}

module.exports = currentCompany;
