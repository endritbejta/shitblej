const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const config = require("./config");
const errorHandler = require("./middleware/error");
const apiRoutes = require("./routes");

// Cross-module event subscribers. Registered at app build so every entry
// point (server, tests, future workers) gets consistent domain behavior.
require("./modules/notifications/notification.subscribers").register();
require("./modules/offers/offer.subscribers").register();

// Build and return the Express application. Kept free of any `listen()` call so
// it can be imported directly by tests (Supertest) without opening a port.
const app = express();

// CORS must come before anything else.
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Request logging (dev only — silent in production and tests)
if (config.isDev) {
  app.use(morgan("dev"));
}

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok", env: config.env });
});

// Mount all feature modules under the versioned API prefix
app.use("/api/v1", apiRoutes);

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
