const express = require('express');
const AuthController = require('../../../controllers/api/v1/AuthController');

const router = express.Router();

router.post('/login', AuthController.login);

module.exports = router;