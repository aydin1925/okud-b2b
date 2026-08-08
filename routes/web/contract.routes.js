const express = require('express');
const ContractTemplateController = require('../../controllers/web/ContractTemplateController');

// Mount: '/company/contracts' + requireAuth + requireCompanyManager (server.js'te)
const router = express.Router();

router.get('/',              ContractTemplateController.showList);
router.get('/:type/edit',    ContractTemplateController.showEdit);
router.post('/:type',        ContractTemplateController.update);
router.post('/:type/reset',  ContractTemplateController.reset);

module.exports = router;
