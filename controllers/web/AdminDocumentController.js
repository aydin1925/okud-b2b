const DocumentService = require('../../services/DocumentService');
const { DOCUMENT_TYPE_LABELS } = require('../../utils/constants');

async function showPending(req, res) {
  const documents = await DocumentService.listPending();
  res.render('admin/documents/pending', {
    title: 'Onay Bekleyen Belgeler',
    documents,
    typeLabels: DOCUMENT_TYPE_LABELS,
  });
}

async function verify(req, res) {
  try {
    await DocumentService.verifyDocument(
      parseInt(req.params.id, 10),
      req.session.userId
    );
    res.redirect('/admin/documents/pending');
  } catch (err) {
    res.status(400).send(`Onay hatası: ${err.message}`);
  }
}

async function reject(req, res) {
  try {
    await DocumentService.rejectDocument(
      parseInt(req.params.id, 10),
      req.session.userId,
      req.body.reason
    );
    res.redirect('/admin/documents/pending');
  } catch (err) {
    res.status(400).send(`Reddetme hatası: ${err.message}`);
  }
}

module.exports = { showPending, verify, reject };
