const Notification = require("./notification.model");
const ErrorResponse = require("../../shared/utils/errorResponse");
const domainEvents = require("../../shared/events/domainEvents");
const {
  parsePagination,
  buildPageLinks,
} = require("../../shared/utils/paginate");

// Emitted after a notification is persisted so delivery channels (websocket
// today; email/push/SMS later) can fan out without this service knowing about
// any of them.
const NOTIFICATION_EVENTS = Object.freeze({ CREATED: "notifications.created" });

// @desc Persist a notification and announce it to delivery channels.
exports.createNotification = async ({ recipient, type, data = {} }) => {
  const notification = await Notification.create({ recipient, type, data });
  domainEvents.publish(NOTIFICATION_EVENTS.CREATED, {
    notificationId: notification._id.toString(),
    recipientId: String(recipient),
    type,
    notification: notification.toObject(),
  });
  return notification;
};

// @desc List the user's notifications, newest first, with unread count.
exports.listForUser = async (userId, rawQuery = {}) => {
  const filter = { recipient: userId };
  if (rawQuery.unread === "true") filter.read = false;

  const { page, limit, skip } = parsePagination(rawQuery);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);

  return {
    notifications,
    count: notifications.length,
    total,
    unreadCount,
    pagination: buildPageLinks({
      page,
      limit,
      skip,
      total,
      returned: notifications.length,
    }),
  };
};

// @desc Mark one of the user's notifications as read.
exports.markRead = async ({ notificationId, userId }) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) {
    throw new ErrorResponse(
      `Notification not found with id of ${notificationId}`,
      404
    );
  }
  return notification;
};

// @desc Mark all of the user's notifications as read.
exports.markAllRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  return { updated: result.modifiedCount };
};

exports.NOTIFICATION_EVENTS = NOTIFICATION_EVENTS;
