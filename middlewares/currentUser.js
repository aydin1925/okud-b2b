function currentUser(req, res, next) {
  if (req.session.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      email: req.session.userEmail,
      name: req.session.userName,
      isSuperadmin: !!req.session.isSuperadmin,
      // Banner + koşullu kısıtlar için — null iken sarı bant görünür.
      emailVerifiedAt: req.session.emailVerifiedAt || null,
    };
  } else {
    res.locals.currentUser = null;
  }
  next();
}

module.exports = currentUser;
