const express = require('express');
const PartnershipInvitationController = require('../../controllers/web/PartnershipInvitationController');
const PartnershipController = require('../../controllers/web/PartnershipController');

// Mount: '/company/partnerships' + requireAuth + requireCompanyAdmin (server.js'te)
const router = express.Router();

// ÖNEMLİ: /invitations route'ları /:id'den ÖNCE — yoksa :id "invitations"'ı yakalar.
// Express 5'te regex kısıtı (:id(\\d+)) desteklenmediği için sıralama ile çözüyoruz.

router.get('/', PartnershipController.showList);

router.get('/invitations',              PartnershipInvitationController.showList);
router.get('/invitations/create',       PartnershipInvitationController.showCreateForm);
router.post('/invitations/create',      PartnershipInvitationController.create);
router.post('/invitations/:id/cancel',  PartnershipInvitationController.cancel);

// :id yakalayan route'lar EN SONDA
router.get('/:id',            PartnershipController.showDetail);
router.post('/:id/terminate', PartnershipController.terminate);

module.exports = router;
