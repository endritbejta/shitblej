const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const config = require('./index');

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

// Configure storage. The engine is ours (see cloudinaryStorage.js) rather
// than multer-storage-cloudinary, which pinned cloudinary 1.x as a peer and
// was abandoned in 2022 - blocking the 2.x upgrade that fixes an
// argument-injection advisory.
const { CloudinaryStorage } = require('./cloudinaryStorage');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'shitblej-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});

// Create upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

module.exports = { upload, cloudinary };
