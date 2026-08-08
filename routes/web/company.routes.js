const express = require('express');
const CompanyController = require('../../controllers/web/CompanyController');

// Mount: '/companies' + requireAuth (server.js'te)
const router = express.Router();

router.get('/create',  CompanyController.showCreateForm);
router.post('/create', CompanyController.create);

router.post('/switch', CompanyController.switchCompany);
router.post('/clear',  CompanyController.clearCurrentCompany);

module.exports = router;
