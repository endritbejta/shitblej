const mongoose = require("mongoose");
const {
  OFFER_STATUS,
  OFFER_TYPE,
  OFFER_PARTY,
} = require("./offer.constants");

// A single proposal in a negotiation. Immutable once resolved: responses
// change only `status` (+ response metadata); counters create new documents.
const OfferSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
    // Listing snapshot at proposal time - chat cards and history must render
    // even if the product is edited or deleted mid-negotiation.
    productName: { type: String, required: true },
    productImage: { type: String },
    askingPriceCents: { type: Number, required: true, min: 0 },

    // The two humans negotiating. Constant across the whole chain regardless
    // of who proposed the current round.
    buyer: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.ObjectId, ref: "User", required: true },

    // Who made THIS proposal; the other party is the one who may respond.
    proposedBy: {
      type: String,
      enum: Object.values(OFFER_PARTY),
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(OFFER_TYPE),
      required: true,
    },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, default: "EUR" },

    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.PENDING,
      index: true,
    },

    // Negotiation chain: previousOffer links to the proposal this one
    // countered; negotiationRoot groups the whole thread for history queries.
    previousOffer: { type: mongoose.Schema.ObjectId, ref: "Offer" },
    negotiationRoot: {
      type: mongoose.Schema.ObjectId,
      ref: "Offer",
      required: true,
      index: true,
    },

    message: { type: String, maxlength: 500 },

    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date },
    // Set on acceptance: how long the reservation waits for checkout.
    checkoutExpiresAt: { type: Date },
    // Set when the buyer completes checkout - the offer is now consumed.
    order: { type: mongoose.Schema.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

// THE core invariant: at most one live proposal per buyer per product.
// Enforced by the database so no race between two requests can violate it.
OfferSchema.index(
  { product: 1, buyer: 1 },
  {
    unique: true,
    partialFilterExpression: { status: OFFER_STATUS.PENDING },
  }
);

// Inbox-style queries for both parties.
OfferSchema.index({ seller: 1, status: 1, createdAt: -1 });
OfferSchema.index({ buyer: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Offer", OfferSchema);
