const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getConversations,
  getConversationBetween,
} = require("./message.controller");
const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  sendMessageSchema,
  conversationBetweenSchema,
} = require("./message.validation");

// Send a new message
router.post("/", protect, validate(sendMessageSchema), sendMessage);

// Get all conversations for the current user
router.get("/conversations", protect, getConversations);

// Get the message thread between the current user and another user.
// Declared last so "conversations" isn't captured as a :userId.
router.get(
  "/:userId",
  protect,
  validate(conversationBetweenSchema),
  getConversationBetween
);

module.exports = router;
