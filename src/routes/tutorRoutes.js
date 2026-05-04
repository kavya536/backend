const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const { uploadFields } = require('../middleware/upload');

router.post('/register', uploadFields, tutorController.registerTutor);
router.post('/approve', tutorController.approveTutor);
router.post('/reject', tutorController.rejectTutor);

module.exports = router;
