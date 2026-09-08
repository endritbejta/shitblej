const fs = require("fs");
const multer = require("multer");
const path = require("path");

const config = require("./index");
const logger = require("../shared/logger");
const { cloudinary } = require("./cloudinary");
const { CloudinaryStorage } = require("./cloudinaryStorage");
const { destroyAssets } = require("../shared/utils/cloudinaryAssets");
const { LocalUploadStorage } = require("./localUploadStorage");

// Single place that decides where uploaded images go, so no route has to know.
//
// Previously `config/cloudinary.js` both configured the SDK and built the
// multer middleware, which meant image upload was Cloudinary or nothing: the
// app could not run from a fresh clone, and the listing flow could not be
// exercised end to end, without real credentials for a paid third-party
// service. That module now only owns the SDK; the driver choice lives here.

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const CLOUDINARY_PARAMS = {
  folder: "shitblej-products",
  allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
  transformation: [
    { width: 1200, height: 1200, crop: "limit" },
    { quality: "auto" },
    { fetch_format: "auto" },
  ],
};

const isLocal = config.uploads.driver === "local";

const storage = isLocal
  ? new LocalUploadStorage({
      directory: config.uploads.directory,
      publicPath: config.uploads.publicPath,
    })
  : new CloudinaryStorage({ cloudinary, params: CLOUDINARY_PARAMS });

if (isLocal) {
  // Worth a line in the log: someone reading it needs to know images are not
  // going anywhere durable.
  logger.warn(
    { directory: config.uploads.directory },
    "UPLOAD_DRIVER=local - images are written to local disk, not Cloudinary"
  );
}

const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES } });

/**
 * Delete images that were uploaded for a request which then failed.
 *
 * Driver-aware on purpose. `file.filename` means different things per driver -
 * a Cloudinary public id or a name on disk - so a single deletion path would
 * ask Cloudinary to destroy a local filename, log an error for every failed
 * upload, and leave the local file behind.
 *
 * Never throws: cleanup runs after the request outcome is already decided.
 */
const removeUploads = async (files = []) => {
  const names = files.map((file) => file && file.filename).filter(Boolean);
  if (names.length === 0) return { destroyed: 0 };

  if (!isLocal) return destroyAssets(names);

  const results = await Promise.allSettled(
    names.map((name) =>
      fs.promises.unlink(path.join(config.uploads.directory, name))
    )
  );

  const failed = results.filter(
    (r) => r.status === "rejected" && r.reason?.code !== "ENOENT"
  );
  if (failed.length > 0) {
    logger.error(
      { failed: failed.length, total: names.length },
      "local upload cleanup left orphaned files"
    );
  }

  return { destroyed: names.length - failed.length };
};

module.exports = { upload, removeUploads, MAX_FILE_BYTES };
