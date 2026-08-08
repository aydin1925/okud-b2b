function requireSuperAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  if (!req.session.isSuperadmin) {
    return res.status(403).send('Bu sayfaya erişim yetkin yok.');
  }
  next();
}

module.exports = requireSuperAdmin;
