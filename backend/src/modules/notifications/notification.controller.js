const asyncHandler = require("../../middleware/async");
const notificationService = require("./notification.service");

// @desc    List my notifications (?unread=true for unread only)
// @route   GET /api/v1/notifications
// @access  Private
exports.listNotifications = asyncHandler(async (req, res) => {
  const { notifications, count, pagination, unreadCount } =
    await notificationService.listForUser(req.user.id, req.query);
  res
    .status(200)
    .json({ success: true, count, unreadCount, pagination, data: notifications });
});

// @desc    Mark one notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
exports.markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead({
    notificationId: req.params.id,
    userId: req.user.id,
  });
  res.status(200).json({ success: true, data: notification });
});

// @desc    Mark all my notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
exports.markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user.id);
  res.status(200).json({ success: true, data: result });
});
