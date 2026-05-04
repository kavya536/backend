const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/success', bookingController.handleBookingSuccess);

module.exports = router;
