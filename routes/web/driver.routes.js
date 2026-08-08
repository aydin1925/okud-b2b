const express = require('express');
const DriverController = require('../../controllers/web/DriverController');
const DocumentController = require('../../controllers/web/DocumentController');
const { documentUpload } = require('../../config/upload');

// Mount: '/driver' + requireAuth (server.js'te)
const router = express.Router();

router.get('/profile',         DriverController.showMyProfile);
router.get('/profile/create',  DriverController.showCreateForm);
router.post('/profile/create', DriverController.create);

// Edit + hassas alan talep akışı
router.get('/profile/edit',    DriverController.showEditForm);
router.post('/profile/edit',   DriverController.updateProfile);
router.post('/profile/updates/:id/cancel', DriverController.cancelUpdateRequest);

router.post(
  '/documents/upload',
  documentUpload.single('file'),
  DocumentController.uploadDriverDocument
);

module.exports = router;
