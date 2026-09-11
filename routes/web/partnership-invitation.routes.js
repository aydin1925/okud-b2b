const express = require('express');
const PartnershipInvitationController = require('../../controllers/web/PartnershipInvitationController');

// Mount: '/company/partnerships/invitations' + requireAuth + requireCompanyAdmin
//        + requireProviderCompany (server.js'te)
// Ortaklık daveti üretme sadece hizmet sağlayıcı kurumlara özel.
const router = express.Router();

router.get('/',            PartnershipInvitationController.showList);
router.get('/create',      PartnershipInvitationController.showCreateForm);
router.post('/create',     PartnershipInvitationController.create);
router.post('/:id/cancel', PartnershipInvitationController.cancel);

module.exports = router;
