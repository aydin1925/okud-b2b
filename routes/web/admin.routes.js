const express = require('express');
const AdminHubController = require('../../controllers/web/AdminHubController');
const AdminDocumentController = require('../../controllers/web/AdminDocumentController');
const AdminDriverUpdateController = require('../../controllers/web/AdminDriverUpdateController');
const AdminVehicleUpdateController = require('../../controllers/web/AdminVehicleUpdateController');
const AdminCompanyApprovalController = require('../../controllers/web/AdminCompanyApprovalController');
const AdminApprovalsController = require('../../controllers/web/AdminApprovalsController');
const AdminAuditController = require('../../controllers/web/AdminAuditController');

// Mount: '/admin' + requireSuperAdmin (server.js'te)
const router = express.Router();

// Hub
router.get('/', AdminHubController.showHub);

// Birleşik onay merkezi — tüm onaylar buradan yönetilir.
// Eski ayrı GET liste sayfaları (documents/pending, companies, driver-updates,
// vehicle-updates) kaldırıldı; approvals hub onların yerine geçti.
// POST aksiyonları (verify/reject/approve) hub formları tarafından kullanılıyor — korunuyor.
router.get('/approvals', AdminApprovalsController.showApprovals);

// Denetim izi — salt-okunur, filtreli, sayfalı (append-only audit_logs)
router.get('/audit', AdminAuditController.showAudit);

// Belgeler — aksiyonlar
router.post('/documents/:id/verify', AdminDocumentController.verify);
router.post('/documents/:id/reject', AdminDocumentController.reject);

// Kurumlar — aksiyonlar
router.post('/companies/:id/approve', AdminCompanyApprovalController.approve);
router.post('/companies/:id/reject',  AdminCompanyApprovalController.reject);

// Şoför profil değişiklikleri — aksiyonlar
router.post('/driver-updates/:id/approve', AdminDriverUpdateController.approve);
router.post('/driver-updates/:id/reject',  AdminDriverUpdateController.reject);

// Araç profil değişiklikleri — aksiyonlar
router.post('/vehicle-updates/:id/approve', AdminVehicleUpdateController.approve);
router.post('/vehicle-updates/:id/reject',  AdminVehicleUpdateController.reject);

module.exports = router;
