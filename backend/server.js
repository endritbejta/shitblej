const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDB = require("./config/db");
const colors = require("colors");
const errorHandler = require("./middleware/error");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const Message = require("./models/Message");

// load dotenv files
dotenv.config();

// connect to database
connectDB();

const products = require("./routes/products");
const users = require("./routes/users");
const messages = require("./routes/messages");
const savedItems = require("./routes/savedItems");

const app = express();

// ✅ ENABLE CORS FIRST — BEFORE ANYTHING ELSE
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// body parser
app.use(express.json());

console.log("MODE: ", process.env.NODE_ENV);

// Dev logger
app.use(morgan("dev"));

// Mount routers
app.use("/api/v1/products", products);
app.use("/api/v1/users", users);
app.use("/api/v1/messages", messages);
app.use("/api/v1/saved-items", savedItems);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User joined room: ${userId}`);
  });

  socket.on("sendMessage", async (data) => {
    const { sender, receiver, text } = data;
    try {
      const message = await Message.create({ sender, receiver, text });
      io.to(receiver).emit("message", message);
      // Optionally emit back to sender for confirmation/optimistic UI updates if not handled by client state
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () =>
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
);

// Handle unhandled rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red.bold);
  server.close(() => process.exit(1));
});
