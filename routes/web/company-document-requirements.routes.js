const express = require('express');
const CompanyDocumentRequirementController = require('../../controllers/web/CompanyDocumentRequirementController');

// Mount: '/company/document-requirements' + requireAuth + requireCompanyManager (server.js'te)
const router = express.Router();

router.get('/',     CompanyDocumentRequirementController.showForm);
router.post('/',    CompanyDocumentRequirementController.save);

module.exports = router;
