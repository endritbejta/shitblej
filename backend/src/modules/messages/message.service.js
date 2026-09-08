const mongoose = require("mongoose");
const Message = require("./message.model");
const ErrorResponse = require("../../shared/utils/errorResponse");
const domainEvents = require("../../shared/events/domainEvents");
const { centsToEuros } = require("../../shared/utils/money");
const { canSendText } = require("./message.policy");
const { containsContactInfo } = require("../../shared/utils/contactFilter");

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
// socket handler so the write path - and therefore the messaging policy -
// lives in exactly one place.
exports.createMessage = async ({ sender, receiver, text, senderRole }) => {
  if (!sender || !receiver || !text) {
    throw new ErrorResponse("sender, receiver, and text are required", 400);
  }

  // Free text requires a live agreement between the pair; negotiation itself
  // happens through offer actions, which enter the thread as offer cards.
  const policy = await canSendText({
    senderId: sender,
    receiverId: receiver,
    senderRole,
  });
  if (!policy.allowed) {
    throw new ErrorResponse(
      "Messaging unlocks after an accepted offer. Make an offer to start negotiating.",
      403,
      policy.reason
    );
  }

  if (containsContactInfo(text)) {
    throw new ErrorResponse(
      "Messages must not contain contact details (phone, email or social handles)",
      400
    );
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
//
// Grouped in the database rather than in JS. The previous implementation read
// every message the user had ever exchanged, populated both parties on each
// one, then deduplicated in memory - so opening the inbox cost O(all messages)
// and grew forever. The pipeline returns one row per partner instead.
exports.getConversations = async (userId) => {
  const id = new mongoose.Types.ObjectId(String(userId));

  return Message.aggregate([
    { $match: { $or: [{ sender: id }, { receiver: id }] } },
    // Newest first, so $first in the group below is the latest message.
    { $sort: { createdAt: -1 } },
    {
      $group: {
        // The other party, whichever side of the message this user is on.
        _id: {
          $cond: [{ $eq: ["$sender", id] }, "$receiver", "$sender"],
        },
        lastMessage: { $first: "$text" },
        time: { $first: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "partner",
      },
    },
    // preserveNull: a deleted account must not make the conversation vanish
    // (nor throw, which is what populating a dangling ref used to do).
    { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
    { $sort: { time: -1 } },
    {
      $project: {
        _id: 0,
        id: "$_id",
        name: { $ifNull: ["$partner.name", "Deleted user"] },
        avatar: { $ifNull: ["$partner.image", DEFAULT_AVATAR] },
        lastMessage: 1,
        time: 1,
      },
    },
  ]);
};

// @desc Get the message thread between two users, oldest-first.
// Offer messages carry the current state of their offer so the client can
// render live cards (with accept/decline/counter buttons on the active one).
//
// Pagination is OPT-IN: pass a limit to get the most recent slice (still
// returned oldest-first, the order a chat view renders). Without one the whole
// thread comes back, as before. The unbounded default is deliberate for now -
// the web client scans the full thread for an offer message carrying an order
// to decide whether the composer is unlocked, so silently windowing it would
// lock chat on long threads. Moving that signal server-side is what unblocks
// making pagination the default.
exports.getConversationBetween = async ({ userA, userB, limit, page = 1 }) => {
  const filter = {
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  };

  if (!limit) {
    return Message.find(filter).sort({ createdAt: 1 }).populate("offer");
  }

  const perPage = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * perPage;

  // Walk backwards from the newest message, then flip so the caller still
  // receives the slice in reading order.
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(perPage)
    .populate("offer");

  return messages.reverse();
};

exports.MESSAGE_EVENTS = MESSAGE_EVENTS;
