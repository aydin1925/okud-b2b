const AdminVehicleUpdateService = require('../../services/AdminVehicleUpdateService');

async function showPending(req, res) {
  const requests = await AdminVehicleUpdateService.listPending();
  res.render('admin/vehicle-updates/pending', {
    title: 'Araç Değişiklik Talepleri',
    requests,
  });
}

async function approve(req, res) {
  try {
    await AdminVehicleUpdateService.approve(
      parseInt(req.params.id, 10), req.session.userId, req.body.note
    );
    res.redirect('/admin/vehicle-updates');
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}. <a href="/admin/vehicle-updates">Geri</a>`);
  }
}

async function reject(req, res) {
  try {
    await AdminVehicleUpdateService.reject(
      parseInt(req.params.id, 10), req.session.userId, req.body.reason
    );
    res.redirect('/admin/vehicle-updates');
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}. <a href="/admin/vehicle-updates">Geri</a>`);
  }
}

module.exports = { showPending, approve, reject };
