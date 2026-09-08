const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../modules/users/user.model");
const messageService = require("../modules/messages/message.service");
const { sendMessageSchema } = require("../modules/messages/message.validation");

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
//
// The user is loaded, not just the token verified, for the same two reasons
// middleware/auth.js does it: a token for a deleted account must stop working,
// and the messaging policy needs the caller's role (admin outreach is exempt
// from the negotiation gate). Verifying the signature alone let a deleted user
// keep connecting, and left every socket-sent message looking like a
// non-admin's.
const authenticateSocket = async (socket, next) => {
  try {
    const token = getTokenFromHandshake(socket);
    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findById(decoded.id).select("role");
    if (!user) {
      return next(new Error("Authentication error: invalid token"));
    }

    socket.userId = String(user._id);
    socket.userRole = user.role;
    next();
  } catch {
    next(new Error("Authentication error: invalid token"));
  }
};

// Per-socket send budget. The REST route is covered by express-rate-limit,
// which never sees websocket frames - without this, `sendMessage` is an
// unmetered write path into the database.
const SEND_WINDOW_MS = 10 * 1000;
const SEND_MAX_PER_WINDOW = 20;

// Sliding-window counter held on the socket, so it dies with the connection.
const withinSendBudget = (socket) => {
  const now = Date.now();
  if (!socket.sendWindowStart || now - socket.sendWindowStart > SEND_WINDOW_MS) {
    socket.sendWindowStart = now;
    socket.sendCount = 0;
  }
  socket.sendCount += 1;
  return socket.sendCount <= SEND_MAX_PER_WINDOW;
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
      if (!withinSendBudget(socket)) {
        return socket.emit("messageError", {
          error: "Too many messages. Please slow down.",
          code: "rate_limited",
        });
      }

      // Same schema the REST route validates against, so a malformed frame is
      // rejected with a clear message instead of reaching Mongoose and coming
      // back as a CastError.
      const parsed = sendMessageSchema.body.safeParse(data);
      if (!parsed.success) {
        return socket.emit("messageError", {
          error: parsed.error.issues.map((i) => i.message).join(". "),
          code: "invalid_payload",
        });
      }

      try {
        // Trust the authenticated identity for `sender`, never the payload.
        // Delivery to the receiver happens via the realtime relay (which
        // listens for messages.created), so REST-sent and offer-generated
        // messages arrive the same way; here we only echo back to the sender
        // for confirmation / optimistic UI.
        const message = await messageService.createMessage({
          sender: socket.userId,
          receiver: parsed.data.receiver,
          text: parsed.data.text,
          senderRole: socket.userRole,
        });

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
