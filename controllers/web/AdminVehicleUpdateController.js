const AdminVehicleUpdateService = require('../../services/AdminVehicleUpdateService');

function backTo(req, fallback) {
  const ret = req.body && req.body._return;
  if (typeof ret === 'string' && ret.startsWith('/admin')) return ret;
  return fallback;
}

async function approve(req, res) {
  try {
    await AdminVehicleUpdateService.approve(
      parseInt(req.params.id, 10), req.session.userId, req.body.note
    );
    res.redirect(backTo(req, '/admin/approvals'));
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}. <a href="/admin/approvals">Geri</a>`);
  }
}

async function reject(req, res) {
  try {
    await AdminVehicleUpdateService.reject(
      parseInt(req.params.id, 10), req.session.userId, req.body.reason
    );
    res.redirect(backTo(req, '/admin/approvals'));
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}. <a href="/admin/approvals">Geri</a>`);
  }
}

module.exports = { approve, reject };
