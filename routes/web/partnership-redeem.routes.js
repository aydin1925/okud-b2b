const express = require('express');
const PartnershipRedeemController = require('../../controllers/web/PartnershipRedeemController');

// Mount: '/partnerships/redeem' + requireAuth + requireCompanyAdmin (server.js'te)
const router = express.Router();

router.get('/',                    PartnershipRedeemController.showForm);
router.post('/',                   PartnershipRedeemController.preview);
router.post('/confirm',            PartnershipRedeemController.confirm);
router.post('/reject',             PartnershipRedeemController.reject);
router.post('/reject-with-notice', PartnershipRedeemController.rejectWithNotice);

module.exports = router;
