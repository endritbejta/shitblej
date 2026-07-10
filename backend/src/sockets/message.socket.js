const jwt = require("jsonwebtoken");
const config = require("../config");
const messageService = require("../modules/messages/message.service");

// Pull a JWT out of the Socket.io handshake. Clients should connect with:
//   io(URL, { auth: { token } })
// We also accept `?token=` for flexibility.
const getTokenFromHandshake = (socket) => {
  const { token } = socket.handshake.auth || {};
  if (token) return token;
  return socket.handshake.query ? socket.handshake.query.token : undefined;
};

// Socket.io authentication middleware. Rejects unauthenticated connections so
// realtime messaging has the same trust guarantees as the REST API.
const authenticateSocket = (socket, next) => {
  try {
    const token = getTokenFromHandshake(socket);
    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }
    const decoded = jwt.verify(token, config.jwt.secret);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Authentication error: invalid token"));
  }
};

// Wire up the realtime messaging namespace on the given Socket.io server.
const registerMessageSocket = (io) => {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    // Each user automatically joins a room named after their own id, so we can
    // target them with io.to(userId).
    socket.join(socket.userId);
    console.log(`Socket connected: user ${socket.userId}`);

    socket.on("sendMessage", async (data = {}) => {
      try {
        // Trust the authenticated identity for `sender`, never the payload.
        const message = await messageService.createMessage({
          sender: socket.userId,
          receiver: data.receiver,
          text: data.text,
        });

        io.to(String(data.receiver)).emit("message", message);
        // Echo back to the sender for confirmation / optimistic UI.
        socket.emit("message", message);
      } catch (err) {
        socket.emit("messageError", {
          error: err.message || "Failed to send message",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: user ${socket.userId}`);
    });
  });
};

module.exports = registerMessageSocket;
