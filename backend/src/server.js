const http = require("http");
const { Server } = require("socket.io");
require("colors");

const config = require("./config");
const connectDB = require("./config/db");
const app = require("./app");
const registerMessageSocket = require("./sockets/message.socket");
const registerRealtimeSubscribers = require("./sockets/realtime.subscribers");

// Connect to the database
connectDB();

console.log("MODE: ", config.env);

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

server.listen(config.port, () =>
  console.log(
    `Server running in ${config.env} mode on port ${config.port}`.yellow.bold
  )
);

// Crash on unhandled promise rejections after logging (fail fast).
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`.red.bold);
  server.close(() => process.exit(1));
});
