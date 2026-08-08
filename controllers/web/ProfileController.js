// controllers/web/ProfileController.js
const UserService = require('../../services/UserService');
const UserModel = require('../../models/UserModel');
const CompanyModel = require('../../models/CompanyModel');
const NotificationModel = require('../../models/NotificationModel');

// Kaç gün önce oluşturulmuş?
function daysSince(date) {
  if (!date) return 0;
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

async function collectPageData(userId, extras = {}) {
  const user = await UserModel.findById(userId);
  const [companies, unread] = await Promise.all([
    CompanyModel.findByUserId(userId),
    NotificationModel.countUnreadByUserId(userId),
  ]);

  return {
    title: 'Profilim',
    user,
    stats: {
      companyCount: companies.length,
      unreadCount:  Number(unread || 0),
      accountAgeDays: daysSince(user && user.created_at),
    },
    errorSection: extras.errorSection || null,
    error:        extras.error        || null,
    formData:     extras.formData     || {},
    flash:        extras.flash        || null,
  };
}

async function showProfile(req, res) {
  const data = await collectPageData(req.session.userId, {
    flash: req.query.flash || null,
  });
  res.render('profile/show', data);
}

async function updateName(req, res) {
  try {
    const { first_name, last_name } = await UserService.updateName(
      req.session.userId, req.body.first_name, req.body.last_name
    );
    // Session'ı senkron et — navbar'daki isim hemen güncellensin
    req.session.userName = `${first_name} ${last_name}`;
    res.redirect('/profile?flash=name-ok');
  } catch (err) {
    const data = await collectPageData(req.session.userId, {
      errorSection: 'name',
      error: err.message,
      formData: req.body,
    });
    res.status(400).render('profile/show', data);
  }
}

async function updateEmail(req, res) {
  try {
    const { email } = await UserService.changeEmail(
      req.session.userId, req.body.new_email, req.body.current_password
    );
    req.session.userEmail = email;
    res.redirect('/profile?flash=email-ok');
  } catch (err) {
    const data = await collectPageData(req.session.userId, {
      errorSection: 'email',
      error: err.message,
      formData: { new_email: req.body.new_email },
    });
    res.status(400).render('profile/show', data);
  }
}

async function updatePassword(req, res) {
  try {
    if (req.body.new_password !== req.body.new_password_confirm) {
      throw new Error('Yeni şifre ile tekrarı eşleşmiyor.');
    }
    await UserService.changePassword(
      req.session.userId, req.body.current_password, req.body.new_password
    );
    res.redirect('/profile?flash=pw-ok');
  } catch (err) {
    const data = await collectPageData(req.session.userId, {
      errorSection: 'password',
      error: err.message,
    });
    res.status(400).render('profile/show', data);
  }
}

module.exports = { showProfile, updateName, updateEmail, updatePassword };
