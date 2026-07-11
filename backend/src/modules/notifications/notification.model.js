const mongoose = require("mongoose");

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

module.exports = mongoose.model("Notification", NotificationSchema);
