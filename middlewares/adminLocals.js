const AdminCompanyApprovalService = require('../services/AdminCompanyApprovalService');

// Superadmin layout'unun sidebar badge'lerini ve aktif linkini basabilmesi için
// her /admin isteğinde bekleyen sayaçları ve mevcut path'i res.locals'a set eder.
module.exports = async function adminLocals(req, res, next) {
  try {
    const raw = req.baseUrl + req.path;
    res.locals.currentPath = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
    res.locals.pendingCounts = await AdminCompanyApprovalService.getPendingCounts();
    next();
  } catch (err) {
    next(err);
  }
};
