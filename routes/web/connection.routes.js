const express = require('express');
const ConnectionRequestController = require('../../controllers/web/ConnectionRequestController');

// Mount: '/company/connections' + requireAuth + requireCompanyManager (server.js'te)
const router = express.Router();

router.get('/',            ConnectionRequestController.showList);
router.get('/create',      ConnectionRequestController.showCreateForm);
router.post('/create',     ConnectionRequestController.create);
router.post('/:id/cancel', ConnectionRequestController.cancel);

module.exports = router;
