const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

const getLocalFileUrl = (req, filename) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/${filename}`;
};

const handleFileUpload = async (file, req) => {
  if (!file) return null;
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'tutor_uploads',
      resource_type: 'auto'
    });
    
    // Clean up local file
    fs.unlink(file.path, (err) => {
      if (err) console.warn("Could not delete temp file:", file.path);
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return getLocalFileUrl(req, file.filename);
  }
};

module.exports = { handleFileUpload, getLocalFileUrl };
