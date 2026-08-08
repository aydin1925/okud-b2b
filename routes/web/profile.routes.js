const express = require('express');
const ProfileController = require('../../controllers/web/ProfileController');

// Mount: '/profile' + requireAuth (server.js'te)
const router = express.Router();

router.get('/',          ProfileController.showProfile);
router.post('/name',     ProfileController.updateName);
router.post('/email',    ProfileController.updateEmail);
router.post('/password', ProfileController.updatePassword);

module.exports = router;
