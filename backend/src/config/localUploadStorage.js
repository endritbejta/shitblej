const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");

// A multer storage engine that writes uploads to a directory on this machine.
//
// Why this exists: image upload was hard-wired to Cloudinary, so listing a
// product required real Cloudinary credentials. That made two things
// impossible - running the app from a fresh clone without an account, and
// testing the listing flow end to end without uploading to (and paying for,
// and having to clean up) a third-party service.
//
// It implements the same StorageEngine contract as CloudinaryStorage, and
// returns the same property names, because the rest of the app is written
// against them:
//   path     - the URL the document stores (product.images)
//   filename - the id deletion works from
//
// NOT for production, and config refuses to boot with it there. Files land on
// the local disk, which on any container platform is ephemeral and per
// instance: images would disappear on the next deploy and be missing on every
// instance but the one that received the upload.

// Extension comes from the mimetype, never from the uploaded filename. The
// file is served back over HTTP later, so a name like "x.html" arriving from
// a client must not be able to decide what this directory serves.
const EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

class LocalUploadStorage {
  /**
   * @param {object}   opts
   * @param {string}   opts.directory  absolute path to write into
   * @param {string}   opts.publicPath URL prefix the directory is served at
   */
  constructor({ directory, publicPath = "/uploads" } = {}) {
    if (!directory) throw new Error("LocalUploadStorage requires a directory");
    this.directory = directory;
    this.publicPath = publicPath;
    fs.mkdirSync(this.directory, { recursive: true });
  }

  _handleFile(req, file, cb) {
    const extension = EXTENSION_BY_MIME[file.mimetype];
    if (!extension) {
      return cb(new Error(`Unsupported image type: ${file.mimetype}`));
    }

    // Generated, so two uploads of "photo.jpg" cannot collide and nothing
    // client-supplied reaches the filesystem.
    const filename = `${crypto.randomUUID()}${extension}`;
    const destination = path.join(this.directory, filename);

    // pipeline destroys both streams on failure, which a bare .pipe() does
    // not - that leaves a half-written file and a leaked descriptor.
    pipeline(file.stream, fs.createWriteStream(destination))
      .then(() => {
        const { size } = fs.statSync(destination);
        cb(null, {
          path: `${this.publicPath}/${filename}`,
          filename,
          size,
          mimetype: file.mimetype,
        });
      })
      .catch((err) => {
        // Best effort: the partial file is useless either way, and the
        // upload error is the one worth reporting.
        fs.promises.unlink(destination).catch(() => {});
        cb(err);
      });
  }

  // Undo a completed write when another file in the same request failed.
  _removeFile(req, file, cb) {
    if (!file.filename) return cb(null);
    fs.promises
      .unlink(path.join(this.directory, file.filename))
      .then(() => cb(null))
      // Already gone is the desired state, not a failure.
      .catch((err) => cb(err.code === "ENOENT" ? null : err));
  }
}

module.exports = { LocalUploadStorage, EXTENSION_BY_MIME };
