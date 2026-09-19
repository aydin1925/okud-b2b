const express = require('express');
const HostessController = require('../../controllers/web/HostessController');
const { documentUpload, verifyUploadedFile } = require('../../config/upload');
const { csrfProtectionRaw } = require('../../config/csrf');

// Mount: '/hostess' + requireAuth (server.js'te)
const router = express.Router();

router.get('/',           HostessController.showList);
router.get('/create',     HostessController.showCreateForm);
router.post('/create',    HostessController.create);
router.post('/assign',    HostessController.assignExisting);

router.get('/:id',         HostessController.showDetail);
router.post('/:id/update', HostessController.updateSafeFields);
router.post('/:id/delete',     HostessController.deleteHostess);
router.post('/:id/activate',   HostessController.setActive);
router.post('/:id/deactivate', HostessController.setActive);

router.post(
  '/:id/documents/upload',
  documentUpload.single('file'),
  csrfProtectionRaw,
  verifyUploadedFile,
  HostessController.uploadDocument
);

module.exports = router;
