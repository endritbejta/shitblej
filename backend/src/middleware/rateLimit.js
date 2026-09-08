const { rateLimit } = require("express-rate-limit");
const config = require("../config");

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

const createRateLimiter = ({ windowMs, max }) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: limitHandler,
  });

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
