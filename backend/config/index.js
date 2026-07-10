const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

// Load the single source of truth for environment variables. We deliberately
// load only the root `.env` (config/config.env has been removed) so there is
// no ambiguity about where configuration comes from.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Validate the environment ONCE, at boot. If a required variable is missing or
// malformed the process refuses to start with a clear message instead of
// failing later with a cryptic runtime error (e.g. an undefined JWT secret).
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  // Auth
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRE: z.string().min(1).default("30d"),

  // CORS / client
  CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL"),

  // Cloudinary (image uploads)
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // Geocoding is currently dormant, so these stay optional.
  GEOCODER_PROVIDER: z.string().optional(),
  GEOCODER_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(
    `\n❌ Invalid environment configuration:\n${issues}\n\n` +
      "Check your .env file against .env.example.\n"
  );
  process.exit(1);
}

const env = parsed.data;

// Export a structured, frozen config object. Application code should read from
// this module instead of touching process.env directly, so there is a single
// documented surface for configuration.
const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isDev: env.NODE_ENV === "development",
  port: env.PORT,

  clientUrl: env.CLIENT_URL,

  db: {
    uri: env.MONGO_URI,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRE,
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },

  geocoder: {
    provider: env.GEOCODER_PROVIDER,
    apiKey: env.GEOCODER_API_KEY,
  },
});

module.exports = config;
