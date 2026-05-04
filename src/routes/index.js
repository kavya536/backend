const express = require('express');
const router = express.Router();

const tutorRoutes = require('./tutorRoutes');
const studentRoutes = require('./studentRoutes');
const authRoutes = require('./authRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');

router.use('/tutor', tutorRoutes);
router.use('/student', studentRoutes);
router.use('/auth', authRoutes);
router.use('/booking', bookingRoutes);
router.use('/webhooks', paymentRoutes);

module.exports = router;
