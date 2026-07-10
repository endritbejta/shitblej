const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getConversations,
  getConversationBetween,
} = require("../controllers/messages");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  sendMessageSchema,
  conversationBetweenSchema,
} = require("../validators/messageValidators");

// Send a new message
router.post("/", protect, validate(sendMessageSchema), sendMessage);

// Get all conversations for the current user
router.get("/conversations", protect, getConversations);

// Get the message thread between the current user and another user.
// Declared last so "conversations" isn't captured as a :userId.
router.get(
  "/:userId",
  validate(conversationBetweenSchema),
  getConversationBetween
);

module.exports = router;
