const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const config = require("./config");
const connectDB = require("./config/db");
const app = require("./app");
const registerMessageSocket = require("./sockets/message.socket");
const registerRealtimeSubscribers = require("./sockets/realtime.subscribers");
const scheduler = require("./jobs/scheduler");
const logger = require("./shared/logger");

// Create the HTTP server from the Express app so both REST and websockets share
// one port.
const server = http.createServer(app);

// Realtime layer
const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ["GET", "POST"],
  },
});
registerMessageSocket(io);
registerRealtimeSubscribers(io);

const start = async () => {
  // Connect BEFORE listening. Mongoose would buffer commands either way, but
  // then a bad MONGO_URI shows up as requests hanging until they time out
  // rather than as a startup failure with the reason attached.
  await connectDB();

  // Background maintenance: releases reservations from agreements that were
  // never checked out. Started here rather than in app.js so importing the app
  // (tests, tooling) never starts a timer.
  scheduler.start();

  server.listen(config.port, () =>
    logger.info({ port: config.port, env: config.env }, "server listening")
  );
};

// Ordered shutdown. Render (and every other platform) sends SIGTERM and then
// kills the process a short while later, so without this the app dies with
// requests in flight and sockets mid-write.
//
// Order matters: stop accepting new work, then let what is in flight finish,
// then close the database.
let shuttingDown = false;

const shutdown = async (signal) => {
  // A second signal during shutdown means "stop waiting".
  if (shuttingDown) {
    logger.warn({ signal }, "second shutdown signal - exiting immediately");
    process.exit(1);
  }
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  // Don't start another sweep mid-shutdown.
  scheduler.stop();

  // Hard deadline: if a connection refuses to drain, exit anyway rather than
  // let the platform SIGKILL us at an arbitrary moment.
  const forceExit = setTimeout(() => {
    logger.error({ timeoutMs: 10_000 }, "shutdown timed out - forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    io.close();
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    await mongoose.connection.close(false);
    logger.info("shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Crash on unhandled promise rejections after logging (fail fast).
process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "unhandled promise rejection - exiting");
  server.close(() => process.exit(1));
});

start().catch((err) => {
  logger.fatal({ err }, "failed to start");
  process.exit(1);
});
