const express = require('express');
const PartnershipController = require('../../controllers/web/PartnershipController');

// Mount: '/company/partnerships' + requireAuth + requireCompanyAdmin (server.js'te)
// NOT: invitations subpath'i ayrı bir router'a taşındı (partnership-invitation.routes.js) —
// çünkü davet üretmek sadece provider'a özel, listelemek/görmek her iki tarafa.
const router = express.Router();

router.get('/', PartnershipController.showList);

// :id yakalayan route'lar — invitations kelimesi başka bir router'da mount edildiği için
// buraya sadece detay ve terminate kalıyor.
router.get('/:id',            PartnershipController.showDetail);
router.post('/:id/terminate', PartnershipController.terminate);

// Provider-only filo scope yönetimi — controller içinde ownership check yapılıyor
// (bu partnership'in provider'ı = current company mi?), route seviyesinde ek middleware yok.
router.get('/:id/fleet-scope',  PartnershipController.showFleetScope);
router.post('/:id/fleet-scope', PartnershipController.updateFleetScope);

module.exports = router;
