const Message = require("./message.model");
const ErrorResponse = require("../../shared/utils/errorResponse");
const domainEvents = require("../../shared/events/domainEvents");
const { centsToEuros } = require("../../shared/utils/money");

const DEFAULT_AVATAR = "https://via.placeholder.com/150";

// Emitted after a message is persisted; the socket layer relays it to the
// receiver in real time regardless of whether it arrived via REST, websocket
// or an offer action.
const MESSAGE_EVENTS = Object.freeze({ CREATED: "messages.created" });

const emitCreated = (message) => {
  domainEvents.publish(MESSAGE_EVENTS.CREATED, {
    messageId: message._id.toString(),
    senderId: String(message.sender._id || message.sender),
    receiverId: String(message.receiver._id || message.receiver),
    message: message.toObject ? message.toObject() : message,
  });
};

// @desc Persist a plain text message. Shared by the REST controller and the
// socket handler so the write path lives in exactly one place.
exports.createMessage = async ({ sender, receiver, text }) => {
  if (!sender || !receiver || !text) {
    throw new ErrorResponse("sender, receiver, and text are required", 400);
  }
  const message = await Message.create({ sender, receiver, text });
  emitCreated(message);
  return message;
};

// Human-readable fallback line for an offer card, also used as the
// conversation-list preview.
const offerFallbackText = (offer) => {
  const amount = `${centsToEuros(offer.amountCents).toFixed(2)} ${offer.currency}`;
  const name = offer.productName;
  switch (offer.status) {
    case "accepted":
      return `Offer accepted: ${amount} for ${name}`;
    case "declined":
      return `Offer declined: ${amount} for ${name}`;
    case "cancelled":
      return `Offer withdrawn: ${amount} for ${name}`;
    default:
      return offer.previousOffer
        ? `Counter offer: ${amount} for ${name}`
        : `Offer: ${amount} for ${name}`;
  }
};

// @desc Drop a negotiation step into the conversation as an offer card.
// Called by the offers service on every lifecycle action.
exports.createOfferMessage = async ({ sender, receiver, offer }) => {
  const message = await Message.create({
    sender,
    receiver,
    type: Message.MESSAGE_TYPE.OFFER,
    offer: offer._id,
    text: offerFallbackText(offer),
  });
  emitCreated(message);
  return message;
};

// @desc Build the conversation list for a user: one entry per partner with the
// most recent message.
exports.getConversations = async (userId) => {
  const messages = await Message.find({
    $or: [{ sender: userId }, { receiver: userId }],
  })
    .populate("sender", "name image")
    .populate("receiver", "name image")
    .sort({ createdAt: -1 });

  const conversations = new Map();

  for (const msg of messages) {
    const isSender = msg.sender._id.toString() === userId;
    const partner = isSender ? msg.receiver : msg.sender;
    const partnerId = partner._id.toString();

    // Messages are sorted newest-first, so the first time we see a partner is
    // their latest message.
    if (!conversations.has(partnerId)) {
      conversations.set(partnerId, {
        id: partner._id,
        name: partner.name,
        avatar: partner.image || DEFAULT_AVATAR,
        lastMessage: msg.text,
        time: msg.createdAt,
      });
    }
  }

  return Array.from(conversations.values());
};

// @desc Get the full message thread between two users, oldest-first.
// Offer messages carry the current state of their offer so the client can
// render live cards (with accept/decline/counter buttons on the active one).
exports.getConversationBetween = async ({ userA, userB }) => {
  return Message.find({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("offer");
};

exports.MESSAGE_EVENTS = MESSAGE_EVENTS;
