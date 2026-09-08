const mongoose = require("mongoose");

// Chat message. Two kinds:
//   text  - a plain user-written message
//   offer - a negotiation step; `offer` references the Offer document and the
//           client renders it as a rich offer card inside the conversation.
//           `text` always holds a plain-language fallback so old clients and
//           conversation previews degrade gracefully.
const MESSAGE_TYPE = Object.freeze({
  TEXT: "text",
  OFFER: "offer",
});

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(MESSAGE_TYPE),
    default: MESSAGE_TYPE.TEXT,
  },
  text: {
    type: String,
    required: [true, "Please add a message text"],
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
// See product.model.js: updatedAt only, so an explicitly-set createdAt
// survives (several tests and the conversation ordering rely on it).
}, { timestamps: { createdAt: false, updatedAt: true } });

// Thread fetch: both legs of the pair filter, in reading order.
MessageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

// The inbox groups on `{ $or: [{ sender: me }, { receiver: me }] }`. Mongo
// serves an $or by using one index per branch, and the composite above can
// only serve the `sender` branch (receiver is not a prefix of it) - so the
// receiver half of every inbox was a collection scan. This is that branch's
// index; createdAt is included so the grouping sort is covered too.
MessageSchema.index({ receiver: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);
Message.MESSAGE_TYPE = MESSAGE_TYPE;

module.exports = Message;
