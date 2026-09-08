const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("colors");

const config = require("./config");
const connectDB = require("./config/db");
const app = require("./app");
const registerMessageSocket = require("./sockets/message.socket");
const registerRealtimeSubscribers = require("./sockets/realtime.subscribers");
const scheduler = require("./jobs/scheduler");

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

  console.log("MODE: ", config.env);

  // Background maintenance: releases reservations from agreements that were
  // never checked out. Started here rather than in app.js so importing the app
  // (tests, tooling) never starts a timer.
  scheduler.start();

  server.listen(config.port, () =>
    console.log(
      `Server running in ${config.env} mode on port ${config.port}`.yellow.bold
    )
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
    console.log(`${signal} received again - exiting now`.red);
    process.exit(1);
  }
  shuttingDown = true;
  console.log(`\n${signal} received - shutting down`.yellow);

  // Don't start another sweep mid-shutdown.
  scheduler.stop();

  // Hard deadline: if a connection refuses to drain, exit anyway rather than
  // let the platform SIGKILL us at an arbitrary moment.
  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out - forcing exit".red);
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    io.close();
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    await mongoose.connection.close(false);
    console.log("Shutdown complete".green);
    process.exit(0);
  } catch (err) {
    console.error(`Error during shutdown: ${err.message}`.red);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Crash on unhandled promise rejections after logging (fail fast).
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err && err.message}`.red.bold);
  server.close(() => process.exit(1));
});

start().catch((err) => {
  console.error(`Failed to start: ${err.message}`.red.bold);
  process.exit(1);
});
