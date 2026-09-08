const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");

const config = require("./config");
const errorHandler = require("./middleware/error");
const cleanupUploads = require("./middleware/cleanupUploads");
const { apiLimiter } = require("./middleware/rateLimit");
const { noStore } = require("./middleware/cache");
const apiRoutes = require("./routes");

// Cross-module event subscribers. Registered at app build so every entry
// point (server, tests, future workers) gets consistent domain behavior.
require("./modules/notifications/notification.subscribers").register();
require("./modules/offers/offer.subscribers").register();

// Build and return the Express application. Kept free of any `listen()` call so
// it can be imported directly by tests (Supertest) without opening a port.
const app = express();

// Rate limiting keys on the client IP, so the app must know how many proxies
// sit in front of it. Set TRUST_PROXY_HOPS=1 when deploying behind Render,
// Heroku or an Nginx ingress; leaving it at 0 locally is correct.
if (config.trustProxyHops > 0) {
  app.set("trust proxy", config.trustProxyHops);
}

// Security headers first, so they are present on every response including
// errors and 404s.
app.use(helmet());

// CORS must come before the routes.
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Body parser. Capped well below the default 100kb: no endpoint accepts a
// large JSON document (images go through multipart/Cloudinary), so a bigger
// limit is only useful to someone trying to exhaust memory.
app.use(express.json({ limit: "32kb" }));

// Request logging (dev only — silent in production and tests)
if (config.isDev) {
  app.use(morgan("dev"));
}

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok", env: config.env });
});

// Mount all feature modules under the versioned API prefix. The blanket
// limiter sits here rather than on the app so /health stays reachable for
// uptime probes; auth routes add a tighter limiter of their own.
// `noStore` before the limiter, not after. Middleware that short-circuits
// never calls next(), so with the limiter first a 429 went out with no cache
// policy at all - the one response under this prefix that escaped the
// default. Setting the header first covers every response including the ones
// that never reach a route, and product routes still override it downstream.
app.use("/api/v1", noStore, apiLimiter, apiRoutes);

// Failed requests that already uploaded images release them before the error
// is reported, so a rejected payload cannot leave orphans in Cloudinary.
app.use(cleanupUploads);

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
