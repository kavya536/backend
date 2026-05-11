const express = require('express');
const router = express.Router();

const tutorController = require('../controllers/tutorController');
const studentController = require('../controllers/studentController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');
const paymentController = require('../controllers/paymentController');
const supportController = require('../controllers/supportController');
const { uploadFields } = require('../middleware/upload');

// --- TUTOR ROUTES (Original Flat Paths) ---
router.post('/register-tutor', uploadFields, tutorController.registerTutor);
router.post('/approve-tutor', tutorController.approveTutor);
router.post('/reject-tutor', tutorController.rejectTutor);

// --- STUDENT ROUTES ---
router.post('/register-student', studentController.registerStudent);

// --- AUTH ROUTES ---
router.get('/auth/verify', authController.verifyEmail);
router.post('/auth/reset-password', authController.resetPassword);

// --- BOOKING & PAYMENTS ---
router.post('/create-razorpay-order', paymentController.createRazorpayOrder);
router.post('/booking-success', bookingController.handleBookingSuccess);
router.post('/webhooks/razorpay', paymentController.handleRazorpayWebhook);

// --- SUPPORT & INQUIRIES ---
router.post('/respond-to-inquiry', supportController.respondToInquiry);

module.exports = router;
