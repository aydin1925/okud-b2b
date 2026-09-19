const express = require('express');
const VehicleController = require('../../controllers/web/VehicleController');
const DocumentController = require('../../controllers/web/DocumentController');
const { documentUpload, verifyUploadedFile } = require('../../config/upload');
const { csrfProtectionRaw } = require('../../config/csrf');

// Mount: '/vehicles' + requireAuth (server.js'te)
const router = express.Router();

// ÖNEMLİ: statik path'ler (/create) :id ile çakışmasın diye ÖNCE
router.get('/',        VehicleController.showList);
router.get('/create',  VehicleController.showCreateForm);
router.post('/create', VehicleController.create);

// :id'li route'lar sonra
router.get('/:id',         VehicleController.showDetail);
router.get('/:id/edit',    VehicleController.showEditForm);
router.post('/:id/edit',   VehicleController.updateVehicle);
router.post('/:id/updates/:reqId/cancel', VehicleController.cancelUpdateRequest);
router.post('/:id/delete',     VehicleController.deleteVehicle);
router.post('/:id/activate',   VehicleController.setActive);
router.post('/:id/deactivate', VehicleController.setActive);

router.post(
  '/:id/documents/upload',
  documentUpload.single('file'),
  csrfProtectionRaw,
  verifyUploadedFile,
  DocumentController.uploadVehicleDocument
);

module.exports = router;
