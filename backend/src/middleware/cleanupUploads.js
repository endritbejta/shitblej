const { removeUploads } = require("../config/upload");

// Error-handling middleware that deletes images already uploaded for a request
// that then failed.
//
// Uploads have to run BEFORE validation on multipart routes, because the text
// fields only exist on req.body once multer has parsed the form. So by the time
// a payload is rejected, up to 5 images (5MB each) are already sitting in
// Cloudinary with nothing referencing them - and multer only auto-removes files
// when multer itself is what failed, not when downstream middleware rejects.
//
// Mounted before the main error handler, so every upload route is covered by
// one rule rather than each controller remembering to clean up after itself.
const cleanupUploads = (err, req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);

  if (files.length > 0) {
    // Fire and forget: the client's error response must not wait on the image
    // host, and removeUploads already swallows and logs its own failures.
    // Driver-aware, so a local upload is unlinked rather than sent to
    // Cloudinary as if its filename were a public id.
    removeUploads(files).catch(() => {});
  }

  next(err);
};

module.exports = cleanupUploads;
