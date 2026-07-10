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
