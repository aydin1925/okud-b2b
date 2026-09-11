const express = require('express');
const FleetController = require('../../controllers/web/FleetController');

// Mount: '/company/fleet' + requireAuth + requireCompanyManager (server.js'te)
const router = express.Router();

router.get('/drivers',      FleetController.showDrivers);
router.get('/vehicles',     FleetController.showVehicles);
router.get('/drivers/:id',  FleetController.showDriverDetail);
router.get('/vehicles/:id', FleetController.showVehicleDetail);

// Kurum tarafı pause/resume — sadece o kurumun connection'ında geçici pasife alır.
router.post('/:type/:id/pause',  FleetController.pauseMember);
router.post('/:type/:id/resume', FleetController.resumeMember);

module.exports = router;
