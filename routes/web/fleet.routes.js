const express = require('express');
const FleetController = require('../../controllers/web/FleetController');

// Mount: '/company/fleet' + requireAuth + requireCompanyManager (server.js'te)
const router = express.Router();

router.get('/drivers',      FleetController.showDrivers);
router.get('/vehicles',     FleetController.showVehicles);
router.get('/drivers/:id',  FleetController.showDriverDetail);
router.get('/vehicles/:id', FleetController.showVehicleDetail);

module.exports = router;
