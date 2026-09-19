const DocumentService = require('../../services/DocumentService');

async function uploadDriverDocument(req, res) {
  try {
    await DocumentService.uploadDriverDocument(
      {
        file: req.file,
        document_type: req.body.document_type,
        expires_at: req.body.expires_at,
      },
      req.session.userId
    );
    res.redirect('/driver/profile');
  } catch (err) {
    res.status(400).send(`Yükleme hatası: ${err.message}. <a href="/driver/profile">Geri dön</a>`);
  }
}

async function uploadVehicleDocument(req, res) {
  const vehicleId = parseInt(req.params.id, 10);
  try {
    await DocumentService.uploadVehicleDocument(
      {
        file: req.file,
        document_type: req.body.document_type,
        expires_at: req.body.expires_at,
        vehicleId,
      },
      req.session.userId
    );
    res.redirect(`/vehicles/${vehicleId}`);
  } catch (err) {
    res.status(400).send(`Yükleme hatası: ${err.message}. <a href="/vehicles/${vehicleId}">Geri dön</a>`);
  }
}

// Yetkili belge görüntüleme — dosyayı tarayıcıda inline açar (PDF/JPG).
async function viewFile(req, res) {
  const viewer = {
    userId: req.session.userId,
    isSuperadmin: !!req.session.isSuperadmin,
    companyId: req.session.currentCompanyId || null,
  };
  try {
    const file = await DocumentService.getFileForViewer(parseInt(req.params.id, 10), viewer);
    res.setHeader('Content-Type', file.mimeType);
    // inline → tarayıcıda aç; indirilmek istenirse kullanıcı kaydeder
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.sendFile(file.absolutePath);
  } catch (err) {
    res.status(403).send('Belge görüntülenemedi. Yetkin olmayabilir ya da dosya bulunamadı.');
  }
}

module.exports = { uploadDriverDocument, uploadVehicleDocument, viewFile };
