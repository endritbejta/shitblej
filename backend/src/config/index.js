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

  // Where uploaded images go.
  //
  // "cloudinary" is what production uses. "local" writes to UPLOAD_DIR and
  // serves it back over HTTP, so the app runs from a fresh clone - and the
  // listing flow can be tested end to end - without a Cloudinary account.
  // It is refused in production below.
  UPLOAD_DRIVER: z.enum(["cloudinary", "local"]).default("cloudinary"),
  UPLOAD_DIR: z.string().min(1).default(".uploads"),

  // Origin the stored image URLs point at, for UPLOAD_DRIVER=local.
  //
  // It has to be absolute. A root-relative "/uploads/x.png" resolves against
  // whatever origin the page came from, which is the static host and not the
  // API - so every image 404s the moment the frontend is served separately,
  // which is exactly how this app is deployed. Cloudinary returns absolute
  // URLs too, so the stored shape stays the same under either driver.
  UPLOAD_PUBLIC_BASE_URL: z.string().url().optional(),

  // Cloudinary (image uploads). Required only when that driver is selected,
  // which is enforced in the refinement below rather than here - a plain
  // .min(1) would demand credentials from someone who deliberately chose not
  // to use the service.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

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

  // trace | debug | info | warn | error | fatal | silent.
  // Defaults per environment below: quiet in tests so the suite's own output
  // stays readable, info elsewhere.
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .optional(),

  // How long to keep notifications before MongoDB expires them. They are
  // write-once render-data (see notification.model.js), not domain state, so
  // they would otherwise grow without bound. 0 disables expiry entirely.
  NOTIFICATION_TTL_DAYS: z.coerce.number().int().min(0).default(90),

  // Rate limit overrides. The per-environment defaults below are the right
  // answer almost always, but they were the ONLY answer: responding to a
  // burst, or loosening the login limit for an end-to-end run, meant editing
  // code and redeploying. Unset means "use the default for this environment".
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_API_MAX: z.coerce.number().int().positive().optional(),
});

// Cross-field rules. These are the mistakes that would otherwise surface as a
// runtime failure on the first upload, long after deploy.
const envSchemaChecked = envSchema.superRefine((env, ctx) => {
  if (env.UPLOAD_DRIVER === "cloudinary") {
    for (const key of [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when UPLOAD_DRIVER=cloudinary`,
        });
      }
    }
  }

  // Local uploads on a container platform land on a disk that is ephemeral
  // and per instance: images vanish on the next deploy, and are missing on
  // every instance except the one that received them. Refusing to boot is
  // kinder than serving broken images.
  if (env.UPLOAD_DRIVER === "local" && env.NODE_ENV === "production") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["UPLOAD_DRIVER"],
      message:
        "UPLOAD_DRIVER=local is not usable in production - local disk is " +
        "ephemeral and per instance. Use cloudinary.",
    });
  }
});

const parsed = envSchemaChecked.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  // console, not the logger, and deliberately: the logger reads its level
  // from this module, so it cannot exist yet. This is the one place in the
  // codebase where console is the correct call.
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
const RATE_LIMIT_DEFAULTS =
  env.NODE_ENV === "test"
    ? { windowMs: 15 * 60 * 1000, authMax: 1e6, apiMax: 1e6 }
    : { windowMs: 15 * 60 * 1000, authMax: 10, apiMax: 300 };

const RATE_LIMITS = {
  windowMs: env.RATE_LIMIT_WINDOW_MS ?? RATE_LIMIT_DEFAULTS.windowMs,
  authMax: env.RATE_LIMIT_AUTH_MAX ?? RATE_LIMIT_DEFAULTS.authMax,
  apiMax: env.RATE_LIMIT_API_MAX ?? RATE_LIMIT_DEFAULTS.apiMax,
};

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

  log: {
    level: env.LOG_LEVEL || (env.NODE_ENV === "test" ? "silent" : "info"),
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRE,
  },

  uploads: {
    driver: env.UPLOAD_DRIVER,
    publicBaseUrl: (
      env.UPLOAD_PUBLIC_BASE_URL || `http://127.0.0.1:${env.PORT}`
    ).replace(/\/+$/, ""),
    // Resolved to an absolute path here so nothing downstream depends on the
    // process working directory.
    directory: path.resolve(__dirname, "..", "..", env.UPLOAD_DIR),
    publicPath: "/uploads",
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },
});

module.exports = config;
