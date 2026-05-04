const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/verify', authController.verifyEmail);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
