const { rateLimit } = require("express-rate-limit");
const config = require("../config");
const { MongoRateLimitStore } = require("./rateLimitStore");

// Request rate limiting, per client IP per window.
//
// Two tiers, because the threats are different:
//   - auth endpoints are a credential-guessing and account-enumeration
//     target, so they get a tight limit;
//   - everything else gets a generous ceiling that only stops abuse.
//
// Correct client-IP resolution depends on `trust proxy` matching the real
// number of proxies in front of the app (see config.trustProxyHops) - a wrong
// value makes this middleware either spoofable or collective.
//
// Counters live in MongoDB rather than process memory (see rateLimitStore.js).
// The default in-memory store gives each process its own counters, which
// quietly divides every limit by the number of processes running - the
// deployed API was enforcing roughly double the configured numbers across two
// of them.

// Responses go through the same envelope as every other API error so clients
// have one shape to parse. `code` lets them show a "slow down" state instead
// of matching on the message.
const limitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: "Too many requests. Please try again later.",
    code: "rate_limited",
  });
};

// Which counter store to use. `store` is injectable so tests can exercise the
// limiter without a database, and so swapping in Redis later touches one line.
// Under NODE_ENV=test we fall back to the library default: the suite drives
// hundreds of requests through an in-memory database and per-request counter
// writes would only slow it down. The shared store is covered on its own in
// tests/rateLimitStore.test.js.
const resolveStore = (store) => {
  if (store) return store;
  if (config.env === "test") return null;
  return new MongoRateLimitStore();
};

const createRateLimiter = ({ windowMs, max, store }) => {
  const options = {
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: limitHandler,
  };

  const shared = resolveStore(store);
  if (shared) options.store = shared;

  return rateLimit(options);
};

// Credential endpoints: login and register.
const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
});

// Everything under /api/v1.
const apiLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.apiMax,
});

module.exports = { createRateLimiter, authLimiter, apiLimiter };
