const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const config = require("./config");
const errorHandler = require("./middleware/error");

// Routers
const products = require("./routes/products");
const users = require("./routes/users");
const messages = require("./routes/messages");
const savedItems = require("./routes/savedItems");

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

// Request logging (dev only)
if (!config.isProduction) {
  app.use(morgan("dev"));
}

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok", env: config.env });
});

// Mount routers
app.use("/api/v1/products", products);
app.use("/api/v1/users", users);
app.use("/api/v1/messages", messages);
app.use("/api/v1/saved-items", savedItems);

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
