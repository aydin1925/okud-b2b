const AdminDriverUpdateService = require('../../services/AdminDriverUpdateService');

async function showPending(req, res) {
  const requests = await AdminDriverUpdateService.listPending();
  res.render('admin/driver-updates/pending', {
    title: 'Şoför Profil Değişiklik Talepleri',
    requests,
  });
}

async function approve(req, res) {
  try {
    await AdminDriverUpdateService.approve(
      parseInt(req.params.id, 10),
      req.session.userId,
      req.body.note
    );
    res.redirect('/admin/driver-updates');
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}. <a href="/admin/driver-updates">Geri</a>`);
  }
}

async function reject(req, res) {
  try {
    await AdminDriverUpdateService.reject(
      parseInt(req.params.id, 10),
      req.session.userId,
      req.body.reason
    );
    res.redirect('/admin/driver-updates');
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}. <a href="/admin/driver-updates">Geri</a>`);
  }
}

module.exports = { showPending, approve, reject };
