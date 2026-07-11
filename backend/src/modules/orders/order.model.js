const mongoose = require("mongoose");
const crypto = require("crypto");
const {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} = require("./order.constants");

// An order is the CONTRACT created when an accepted offer is checked out:
// exactly one buyer, one seller, and the agreed price. It cannot exist
// without a source offer - agreement precedes every order by construction.

// Item snapshot: products are editable and deletable by their sellers, so the
// order captures what was actually bought. Display and accounting never
// depend on the product document still existing.
const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String },
    // Minor units (cents) - the price agreed in the negotiation, not the
    // listing price at checkout time.
    unitPriceCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

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

    // The agreement this order fulfils. Unique: one accepted offer can only
    // ever produce one order, which also makes checkout naturally idempotent.
    sourceOffer: {
      type: mongoose.Schema.ObjectId,
      ref: "Offer",
      required: true,
      unique: true,
    },

    buyer: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.ObjectId, ref: "User", required: true },

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
    // Marketplace take. Rate is 0 today, but payouts and revenue reporting
    // need these recorded per order from day one - they cannot be backfilled.
    feeCents: { type: Number, required: true, min: 0, default: 0 },
    sellerNetCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.ACCEPTED,
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
  },
  { timestamps: true }
);

// Dashboard queries: "my purchases" / "my sales", newest first, often
// filtered by status.
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });

// e.g. ORD-MB3K2J-4F7A: time-sortable prefix + random suffix. The unique
// index is the real collision guard.
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
