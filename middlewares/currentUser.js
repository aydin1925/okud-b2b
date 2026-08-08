function currentUser(req, res, next) {
  if (req.session.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      email: req.session.userEmail,
      name: req.session.userName,
      isSuperadmin: !!req.session.isSuperadmin,
    };
  } else {
    res.locals.currentUser = null;
  }
  next();
}

module.exports = currentUser;