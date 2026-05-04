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
    // If using memoryStorage (Vercel/Production)
    if (file.buffer) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'tutor_uploads', resource_type: 'auto' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(file.buffer);
      });
    }

    // Fallback for diskStorage (if still used anywhere)
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'tutor_uploads',
        resource_type: 'auto'
      });
      
      fs.unlink(file.path, (err) => {
        if (err) console.warn("Could not delete temp file:", file.path);
      });

      return result.secure_url;
    }

    return null;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return null;
  }
};

module.exports = { handleFileUpload, getLocalFileUrl };
