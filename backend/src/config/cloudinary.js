const cloudinary = require("cloudinary").v2;
const config = require("./index");

// The Cloudinary SDK, configured. Nothing else - the multer middleware that
// used to live here moved to ./upload.js, which picks a storage driver.
//
// Credentials are optional when UPLOAD_DRIVER=local (see config/index.js), in
// which case the SDK is configured with undefined values and never called:
// local image URLs do not match the Cloudinary URL shape, so the deletion
// helpers skip them.
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

module.exports = { cloudinary };
