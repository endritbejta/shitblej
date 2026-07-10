const asyncHandler = require("../middleware/async");
const messageService = require("../services/messageService");

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
// @route   GET /api/v1/messages/:userId?currentUserId=...
// @access  Public (see note)
//
// NOTE: This endpoint is intentionally left unauthenticated to preserve the
// existing client contract (it identifies the caller via the `currentUserId`
// query param). This is an IDOR risk flagged for the Phase 2 security pass —
// it should move to `protect` and derive the caller from the JWT.
exports.getConversationBetween = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { currentUserId } = req.query;

  const messages = await messageService.getConversationBetween({
    userA: currentUserId,
    userB: userId,
  });

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});
