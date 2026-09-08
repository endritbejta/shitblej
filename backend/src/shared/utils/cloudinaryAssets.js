const { cloudinary } = require("../../config/cloudinary");

// Cloudinary asset cleanup.
//
// Uploaded images are stored on the document as their delivery URL
// (`file.path`), not their public id, so deleting one means recovering the id
// from the URL. A Cloudinary delivery URL looks like:
//
//   https://res.cloudinary.com/<cloud>/image/upload/v1699999999/folder/abc123.jpg
//                                                  └─ optional version ─┘└ public id ┘
//
// Transformations may appear as extra path segments between `upload` and the
// version, so everything up to and including `upload/` is dropped, then an
// optional `v<digits>/` prefix and the file extension.

const CLOUDINARY_URL = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/[^/]+\/upload\/(.+)$/;

// -> public id, or null when this is not a Cloudinary-hosted asset (seeded
// data, placeholder avatars, anything a user pasted in). Those must be left
// alone rather than guessed at.
const publicIdFromUrl = (url) => {
  if (typeof url !== "string") return null;
  const match = url.match(CLOUDINARY_URL);
  if (!match) return null;

  const withoutTransforms = match[1]
    .split("/")
    // Transformation segments carry `,`-joined `k_v` directives (w_100,c_fill).
    .filter((segment) => !/^[a-z]{1,3}_[^/]*$/.test(segment))
    .join("/");

  const withoutVersion = withoutTransforms.replace(/^v\d+\//, "");
  const publicId = withoutVersion.replace(/\.[a-z0-9]+$/i, "");

  return publicId || null;
};

// Destroy assets by public id. Never throws: cleanup runs after the operation
// it is cleaning up for has already been decided, so a Cloudinary outage must
// not turn a successful delete into a failed request. Failures are logged so
// the orphans can be reconciled later.
const destroyAssets = async (publicIds) => {
  const ids = publicIds.filter(Boolean);
  if (ids.length === 0) return { destroyed: 0 };

  const results = await Promise.allSettled(
    ids.map((id) => cloudinary.uploader.destroy(id, { invalidate: true }))
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(
      `Cloudinary cleanup: ${failed.length}/${ids.length} asset(s) not deleted:`,
      failed.map((r) => r.reason && r.reason.message).join("; ")
    );
  }

  return { destroyed: ids.length - failed.length };
};

// Destroy the assets behind a list of stored image URLs.
const destroyByUrls = (urls = []) =>
  destroyAssets(urls.map(publicIdFromUrl));

// Destroy freshly uploaded multer files. These still carry `filename`, which
// multer-storage-cloudinary sets to the public id, so no URL parsing needed.
const destroyUploads = (files = []) =>
  destroyAssets(files.map((file) => file && file.filename));

module.exports = {
  publicIdFromUrl,
  destroyAssets,
  destroyByUrls,
  destroyUploads,
};
