const AdminVehicleUpdateService = require('../../services/AdminVehicleUpdateService');

function backTo(req, fallback) {
  const ret = req.body && req.body._return;
  if (typeof ret === 'string' && ret.startsWith('/admin')) return ret;
  return fallback;
}

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
    res.redirect(backTo(req, '/admin/vehicle-updates'));
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}. <a href="/admin/approvals">Geri</a>`);
  }
}

async function reject(req, res) {
  try {
    await AdminVehicleUpdateService.reject(
      parseInt(req.params.id, 10), req.session.userId, req.body.reason
    );
    res.redirect(backTo(req, '/admin/vehicle-updates'));
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}. <a href="/admin/approvals">Geri</a>`);
  }
}

module.exports = { showPending, approve, reject };
