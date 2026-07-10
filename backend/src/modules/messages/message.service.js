const Message = require("./message.model");
const ErrorResponse = require("../../shared/utils/errorResponse");

const DEFAULT_AVATAR = "https://via.placeholder.com/150";

// @desc Persist a message. Shared by the REST controller and the socket
// handler so the write path lives in exactly one place.
exports.createMessage = async ({ sender, receiver, text }) => {
  if (!sender || !receiver || !text) {
    throw new ErrorResponse("sender, receiver, and text are required", 400);
  }
  return Message.create({ sender, receiver, text });
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
exports.getConversationBetween = async ({ userA, userB }) => {
  return Message.find({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  }).sort({ createdAt: 1 });
};
