const express = require('express');
const DriverController = require('../../controllers/web/DriverController');
const DocumentController = require('../../controllers/web/DocumentController');
const { documentUpload, verifyUploadedFile } = require('../../config/upload');
const { csrfProtectionRaw } = require('../../config/csrf');

// Mount: '/driver' + requireAuth (server.js'te)
const router = express.Router();

router.get('/profile',         DriverController.showMyProfile);
router.get('/profile/create',  DriverController.showCreateForm);
router.post('/profile/create', DriverController.create);

// Edit + hassas alan talep akışı
router.get('/profile/edit',    DriverController.showEditForm);
router.post('/profile/edit',   DriverController.updateProfile);
router.post('/profile/updates/:id/cancel', DriverController.cancelUpdateRequest);
router.post('/profile/delete',     DriverController.deleteProfile);
router.post('/profile/activate',   DriverController.setActive);
router.post('/profile/deactivate', DriverController.setActive);

router.post(
  '/documents/upload',
  documentUpload.single('file'),
  csrfProtectionRaw,           // multipart body parse edildi → _csrf artık okunur
  verifyUploadedFile,
  DocumentController.uploadDriverDocument
);

module.exports = router;
