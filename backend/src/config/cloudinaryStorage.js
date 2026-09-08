// A multer storage engine that streams uploads to Cloudinary.
//
// This replaces `multer-storage-cloudinary`, which was doing the same ~40
// lines but pinned `cloudinary: ^1.21.0` as a peer and was last published in
// June 2022. Cloudinary 1.x carries an argument-injection advisory whose only
// fix is 2.x, and no published version of that package supports 2.x - so an
// abandoned dependency was holding a security upgrade hostage. npm's suggested
// "fix" was to DOWNGRADE it, which resolves nothing.
//
// The engine contract is two methods (see multer's StorageEngine):
//   _handleFile(req, file, cb) -> cb(null, {...properties merged onto file})
//   _removeFile(req, file, cb) -> undo _handleFile
//
// The properties returned here are the ones the app reads elsewhere, so they
// are part of the contract, not incidental:
//   path     - the delivery URL, stored on the document (product.images)
//   filename - the public id, which is what deletion needs
//              (shared/utils/cloudinaryAssets.js)

class CloudinaryStorage {
  // The SDK is injected rather than required here. Requiring it back from
  // ./cloudinary would be circular - that module requires this one while its
  // own module.exports is still unassigned, so the import would resolve to
  // undefined and the first upload would throw. Injection also lets a test
  // hand in a fake.
  constructor({ cloudinary, params = {} } = {}) {
    if (!cloudinary) throw new Error("CloudinaryStorage requires a cloudinary instance");
    this.cloudinary = cloudinary;
    this.params = params;
  }

  _handleFile(req, file, cb) {
    const stream = this.cloudinary.uploader.upload_stream(this.params, (err, result) => {
      if (err) return cb(err);
      if (!result) return cb(new Error("Cloudinary returned no result"));

      cb(null, {
        // Keep these names: the rest of the app is written against them.
        path: result.secure_url,
        filename: result.public_id,
        size: result.bytes,
        mimetype: file.mimetype,
      });
    });

    // Surface a read error on the incoming file rather than leaving the
    // request hanging on a stream that will never finish.
    file.stream.on("error", (err) => {
      stream.destroy();
      cb(err);
    });

    file.stream.pipe(stream);
  }

  // Called by multer when the upload it just performed must be undone -
  // another file in the same request failed, or the limit was exceeded.
  _removeFile(req, file, cb) {
    if (!file.filename) return cb(null);
    this.cloudinary.uploader
      .destroy(file.filename, { invalidate: true })
      .then(() => cb(null))
      .catch(cb);
  }
}

module.exports = { CloudinaryStorage };
