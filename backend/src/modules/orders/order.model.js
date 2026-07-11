const mongoose = require("mongoose");
const crypto = require("crypto");
const {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} = require("./order.constants");

// An order is a contract between exactly one buyer and one seller over a set
// of unique, quantity-one items. Multi-seller checkouts are composed by the
// caller as several orders - this keeps fulfilment, cancellation and future
// payouts unambiguous (money and shipping always involve exactly two parties).

// Item snapshot: products are editable and deletable by their sellers, so the
// order captures what was actually bought at the moment of purchase. Display
// and accounting never depend on the product document still existing.
const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String },
    // Minor units (cents). All money on an order is integer cents - the only
    // float-to-cents conversion happens at placement time in the service.
    unitPriceCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Where and to whom the order ships - snapshotted, never a reference to a
// mutable user profile.
const ShippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: "Kosovo" },
    phone: { type: String, required: true },
  },
  { _id: false }
);

// Append-only audit trail of every lifecycle change.
const StatusHistoryEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    by: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    party: { type: String, required: true },
    note: { type: String, maxlength: 500 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    // Human-readable identifier safe to expose in UIs, emails and support
    // conversations (never leak raw ObjectIds to customers).
    orderNumber: { type: String, unique: true },

    buyer: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },

    items: {
      type: [OrderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },

    currency: { type: String, required: true, default: "EUR" },
    subtotalCents: { type: Number, required: true, min: 0 },
    shippingCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    statusHistory: [StatusHistoryEntrySchema],

    shippingAddress: { type: ShippingAddressSchema, required: true },
    shipment: {
      carrier: { type: String },
      trackingNumber: { type: String },
    },

    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.CASH,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },

    note: { type: String, maxlength: 500 },

    // Client-supplied key that makes order placement retry-safe: a network
    // retry with the same key returns the original order instead of charging
    // and reserving twice.
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

// Dashboard queries: "my purchases" / "my sales", newest first, often
// filtered by status.
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });

// Idempotency guard - unique per buyer, only when a key was supplied.
OrderSchema.index(
  { buyer: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

// e.g. ORD-MB3K2J-4F7A: time-sortable prefix + random suffix. The unique
// index is the real collision guard; the random suffix makes collisions
// practically impossible without a coordination point.
const generateOrderNumber = () => {
  const time = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `ORD-${time}-${rand}`;
};

OrderSchema.pre("validate", function (next) {
  if (!this.orderNumber) this.orderNumber = generateOrderNumber();
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
