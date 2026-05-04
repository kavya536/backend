const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use memoryStorage for Vercel/Production to avoid read-only filesystem errors
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const uploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'avatar', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'identityProof', maxCount: 1 },
  { name: 'qualificationDocs', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 },
  { name: 'experienceDocs', maxCount: 1 },
  { name: 'experienceCertificate', maxCount: 1 },
  { name: 'demoVideo', maxCount: 1 },
  { name: 'videoURL', maxCount: 1 }
]);

module.exports = { uploadFields };
