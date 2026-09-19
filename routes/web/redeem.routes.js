const express = require('express');
const RedeemController = require('../../controllers/web/RedeemController');
const { redeemLimiter } = require('../../config/rateLimit');

// Mount: '/connections/redeem' + requireAuth (server.js'te)
const router = express.Router();

router.get('/',         RedeemController.showForm);
router.post('/',        redeemLimiter, RedeemController.preview);
router.post('/confirm', redeemLimiter, RedeemController.confirm);
router.post('/reject',  RedeemController.reject);

module.exports = router;
