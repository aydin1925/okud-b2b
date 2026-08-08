const express = require('express');
const DashboardController = require('../../controllers/web/DashboardController');

// Mount: '/dashboard' + requireAuth (server.js'te)
const router = express.Router();

router.get('/', DashboardController.showDashboard);

module.exports = router;
