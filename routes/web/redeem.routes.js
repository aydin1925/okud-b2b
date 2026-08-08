const express = require('express');
const RedeemController = require('../../controllers/web/RedeemController');

// Mount: '/connections/redeem' + requireAuth (server.js'te)
const router = express.Router();

router.get('/',         RedeemController.showForm);
router.post('/',        RedeemController.preview);
router.post('/confirm', RedeemController.confirm);
router.post('/reject',  RedeemController.reject);

module.exports = router;
