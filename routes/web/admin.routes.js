const express = require('express');
const AdminHubController = require('../../controllers/web/AdminHubController');
const AdminDocumentController = require('../../controllers/web/AdminDocumentController');
const AdminDriverUpdateController = require('../../controllers/web/AdminDriverUpdateController');
const AdminVehicleUpdateController = require('../../controllers/web/AdminVehicleUpdateController');
const AdminCompanyApprovalController = require('../../controllers/web/AdminCompanyApprovalController');

// Mount: '/admin' + requireSuperAdmin (server.js'te)
const router = express.Router();

// Hub
router.get('/', AdminHubController.showHub);

// Belgeler
router.get('/documents/pending',     AdminDocumentController.showPending);
router.post('/documents/:id/verify', AdminDocumentController.verify);
router.post('/documents/:id/reject', AdminDocumentController.reject);

// Kurumlar
router.get('/companies',              AdminCompanyApprovalController.showPending);
router.post('/companies/:id/approve', AdminCompanyApprovalController.approve);
router.post('/companies/:id/reject',  AdminCompanyApprovalController.reject);

// Şoför profil değişiklikleri
router.get('/driver-updates',              AdminDriverUpdateController.showPending);
router.post('/driver-updates/:id/approve', AdminDriverUpdateController.approve);
router.post('/driver-updates/:id/reject',  AdminDriverUpdateController.reject);

// Araç profil değişiklikleri
router.get('/vehicle-updates',              AdminVehicleUpdateController.showPending);
router.post('/vehicle-updates/:id/approve', AdminVehicleUpdateController.approve);
router.post('/vehicle-updates/:id/reject',  AdminVehicleUpdateController.reject);

module.exports = router;
