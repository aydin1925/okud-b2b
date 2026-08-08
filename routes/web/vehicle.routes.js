const express = require('express');
const VehicleController = require('../../controllers/web/VehicleController');
const DocumentController = require('../../controllers/web/DocumentController');
const { documentUpload } = require('../../config/upload');

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

router.post(
  '/:id/documents/upload',
  documentUpload.single('file'),
  DocumentController.uploadVehicleDocument
);

module.exports = router;
