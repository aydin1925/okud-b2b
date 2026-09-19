const FleetConnectionService = require('../../services/FleetConnectionService');
const { TARGET_TYPE_LABELS } = require('../../utils/constants');

function showForm(req, res) {
  res.render('connections/redeem', {
    title: 'Davet Kodu Gir',
    error: req.query.error || null,
    code: req.query.code || '',
  });
}

async function preview(req, res) {
  try {
    const preview = await FleetConnectionService.getRedeemPreview(
      req.body.code,
      req.session.userId
    );
    res.render('connections/redeem_preview', {
      title: 'Daveti Onayla',
      preview,
      typeLabels: TARGET_TYPE_LABELS,
    });
  } catch (err) {
    res.status(400).render('connections/redeem', {
      title: 'Davet Kodu Gir',
      error: err.message,
      code: req.body.code || '',
    });
  }
}

async function confirm(req, res) {
  try {
    await FleetConnectionService.redeem({
      code: req.body.code,
      userId: req.session.userId,
      kvkkConsent: req.body.kvkk_consent === 'on',
      contractConsent: req.body.contract_consent === 'on',
      driverConsent: req.body.driver_consent === 'on',
      vehicleConsent: req.body.vehicle_consent === 'on',
      vehicleId: req.body.vehicle_id,
      ipAddress: req.ip,
    });
    res.render('connections/redeem_success', { title: 'Filoya Katıldın' });
  } catch (err) {
    // Beyaz sayfa yerine kodun geldiği yere popup ile geri dön
    const q = new URLSearchParams({ error: err.message, code: req.body.code || '' });
    res.redirect('/connections/redeem?' + q.toString());
  }
}

async function reject(req, res) {
  try {
    await FleetConnectionService.rejectByUser({
      code: req.body.code,
      userId: req.session.userId,
    });
    res.render('connections/redeem_rejected', { title: 'Davet Reddedildi' });
  } catch (err) {
    const q = new URLSearchParams({ error: err.message, code: req.body.code || '' });
    res.redirect('/connections/redeem?' + q.toString());
  }
}

module.exports = { showForm, preview, confirm, reject };
