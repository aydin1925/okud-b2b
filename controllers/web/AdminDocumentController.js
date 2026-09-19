const DocumentService = require('../../services/DocumentService');

// req.body._return varsa oraya, yoksa fallback path'e yönlendirir.
// Approvals hub'ından POST edilen form'lar _return ile /admin/approvals?tab=... yazar.
function backTo(req, fallback) {
  const ret = req.body && req.body._return;
  if (typeof ret === 'string' && ret.startsWith('/admin')) return ret;
  return fallback;
}

async function verify(req, res) {
  try {
    await DocumentService.verifyDocument(
      parseInt(req.params.id, 10),
      req.session.userId,
      req.ip
    );
    res.redirect(backTo(req, '/admin/approvals'));
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}`);
  }
}

async function reject(req, res) {
  try {
    await DocumentService.rejectDocument(
      parseInt(req.params.id, 10),
      req.session.userId,
      req.body.reason,
      req.ip
    );
    res.redirect(backTo(req, '/admin/approvals'));
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}`);
  }
}

module.exports = { verify, reject };
