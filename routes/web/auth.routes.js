const express = require('express');
const AuthController = require('../../controllers/web/AuthController');

const router = express.Router();

router.get('/register', AuthController.showRegisterForm);
router.post('/register', AuthController.register);

router.get('/login', AuthController.showLoginForm);
router.post('/login', AuthController.login);

router.post('/logout', AuthController.logout);

module.exports = router;