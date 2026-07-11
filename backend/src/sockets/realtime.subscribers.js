const domainEvents = require("../shared/events/domainEvents");
const { MESSAGE_EVENTS } = require("../modules/messages/message.service");
const {
  NOTIFICATION_EVENTS,
} = require("../modules/notifications/notification.service");

// Bridge from domain events to connected websocket clients. Users join a room
// named after their own id on connect (see message.socket.js), so delivery is
// a room emit. This is the ONLY place that knows both about the event bus and
// about socket.io - services stay transport-agnostic.
const registerRealtimeSubscribers = (io) => {
  // Chat: every persisted message (text, offer card, REST- or socket-sent)
  // reaches the receiver live through this single path.
  domainEvents.on(MESSAGE_EVENTS.CREATED, ({ receiverId, message }) => {
    io.to(receiverId).emit("message", message);
  });

  // Notification badge / toast updates.
  domainEvents.on(
    NOTIFICATION_EVENTS.CREATED,
    ({ recipientId, notification }) => {
      io.to(recipientId).emit("notification", notification);
    }
  );
};

module.exports = registerRealtimeSubscribers;
