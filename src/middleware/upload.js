const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});

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
