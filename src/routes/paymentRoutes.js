const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Razorpay Webhook endpoint
// Note: This endpoint should use raw body for signature verification
router.post('/razorpay', paymentController.handleRazorpayWebhook);

module.exports = router;
