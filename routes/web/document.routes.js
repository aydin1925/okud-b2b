const express = require('express');
const DocumentController = require('../../controllers/web/DocumentController');

// Mount: '/documents' + requireAuth (server.js'te)
const router = express.Router();

// Yetkili belge görüntüleme — yetki kontrolü service katmanında.
router.get('/:id/view', DocumentController.viewFile);

module.exports = router;
