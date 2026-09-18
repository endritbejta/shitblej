// Runs before any module is imported (jest setupFiles). Provides fallback env
// vars so the config module validates even without a local .env (e.g. in CI).
// The MONGO_URI here is a placeholder — tests connect to an in-memory MongoDB
// via tests/helpers/db.js instead.
process.env.NODE_ENV = "test";
process.env.MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/placeholder";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1h";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
process.env.CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || "test-cloud";
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "test-key";
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "test-secret";

// Uploads go to a throwaway directory rather than Cloudinary, so the multipart
// upload path can be exercised for real. Before this driver existed nothing in
// the suite ever posted an image - products were inserted straight through the
// model - so multer, the storage engine and the orphan-cleanup middleware were
// only covered in isolation, never through a request.
process.env.UPLOAD_DRIVER = process.env.UPLOAD_DRIVER || "local";
process.env.UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  require("path").join(require("os").tmpdir(), "shitblej-test-uploads");

// Points the listing-suggestion client at a host that does not exist, on
// purpose. The config module reads the environment once at boot, and the
// shared server is required by setupFilesAfterEnv before any test file's body
// runs, so a test cannot turn this feature on later - it has to be on here.
// Nothing ever reaches this URL: tests/listingSuggestions.test.js stubs
// global.fetch, and no other test calls that endpoint.
process.env.LISTING_AI_URL =
  process.env.LISTING_AI_URL || "http://listing-ai.test";
