const mongoose = require("mongoose");
const config = require("../../config");

// A persisted, per-user notification. Deliberately generic: `type` names the
// business fact, `data` carries the ids and figures a client needs to render
// and deep-link it. New marketplace features add types, not schema changes.
const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, required: true },
    // Snapshot payload (offerId, orderId, productId, productName,
    // amountCents, actorId, ...). Mixed on purpose - notifications are
    // write-once render-data, not queryable domain state.
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

// Expiry. Notifications are a render feed, not a ledger - nothing in the
// domain reads them back - so without this the collection grows for the life
// of the app.
//
// NOTE: this is a TTL index. The first time it builds against an existing
// database, MongoDB deletes every notification older than the window. Set
// NOTIFICATION_TTL_DAYS=0 to keep them forever.
if (config.notifications.ttlDays > 0) {
  NotificationSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: config.notifications.ttlDays * 24 * 60 * 60 }
  );
}

module.exports = mongoose.model("Notification", NotificationSchema);
