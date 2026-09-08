const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

// Load the single source of truth for environment variables. We deliberately
// load only the root `.env` (config/config.env has been removed) so there is
// no ambiguity about where configuration comes from.
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

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

  // Number of reverse proxies in front of the app. Render/Heroku/Nginx put
  // exactly one, and the client IP is then the last entry of X-Forwarded-For.
  // This MUST be accurate: too high and a client can spoof its IP to defeat
  // rate limiting, too low and every request looks like it comes from the
  // proxy (so one user exhausts everyone's quota).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

  // How often the background sweeper expires overdue offers and releases
  // reservations held by agreements that were never checked out.
  OFFER_SWEEP_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 60 * 1000),

  // How long to keep notifications before MongoDB expires them. They are
  // write-once render-data (see notification.model.js), not domain state, so
  // they would otherwise grow without bound. 0 disables expiry entirely.
  NOTIFICATION_TTL_DAYS: z.coerce.number().int().min(0).default(90),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(
    `\nInvalid environment configuration:\n${issues}\n\n` +
      "Check your .env file against .env.example.\n"
  );
  process.exit(1);
}

const env = parsed.data;

// Rate limits are per client IP per window. The test values are effectively
// unlimited: the suite drives hundreds of requests through one process from a
// single address, and throttling it would test the limiter instead of the app.
// The limiter itself is covered directly in tests/rateLimit.test.js.
const RATE_LIMITS =
  env.NODE_ENV === "test"
    ? { windowMs: 15 * 60 * 1000, authMax: 1e6, apiMax: 1e6 }
    : { windowMs: 15 * 60 * 1000, authMax: 10, apiMax: 300 };

// Export a structured, frozen config object. Application code should read from
// this module instead of touching process.env directly, so there is a single
// documented surface for configuration.
const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isDev: env.NODE_ENV === "development",
  port: env.PORT,

  clientUrl: env.CLIENT_URL,
  trustProxyHops: env.TRUST_PROXY_HOPS,

  db: {
    uri: env.MONGO_URI,
  },

  rateLimit: RATE_LIMITS,

  jobs: {
    offerSweepIntervalMs: env.OFFER_SWEEP_INTERVAL_MS,
  },

  notifications: {
    ttlDays: env.NOTIFICATION_TTL_DAYS,
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
});

module.exports = config;
