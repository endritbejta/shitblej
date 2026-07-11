const asyncHandler = require("../../middleware/async");
const messageService = require("./message.service");

// @desc    Send a new message
// @route   POST /api/v1/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res) => {
  // Bind the sender to the authenticated user instead of trusting the body,
  // so a user can never send a message "as" someone else.
  const message = await messageService.createMessage({
    sender: req.user.id,
    receiver: req.body.receiver,
    text: req.body.text,
    senderRole: req.user.role,
  });

  res.status(201).json({ success: true, data: message });
});

// @desc    Get all conversations for the current user
// @route   GET /api/v1/messages/conversations
// @access  Private
exports.getConversations = asyncHandler(async (req, res) => {
  const conversations = await messageService.getConversations(req.user.id);
  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});

// @desc    Get messages between the current user and another user
// @route   GET /api/v1/messages/:userId
// @access  Private
//
// The caller is derived from the JWT — a user can only ever read threads they
// are part of. (Previously this trusted a `currentUserId` query param, which
// let anyone read anyone's messages.)
exports.getConversationBetween = asyncHandler(async (req, res) => {
  const messages = await messageService.getConversationBetween({
    userA: req.user.id,
    userB: req.params.userId,
  });

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});
