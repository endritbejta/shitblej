const Offer = require("../offers/offer.model");
const Order = require("../orders/order.model");
const { OFFER_STATUS } = require("../offers/offer.constants");
const { ORDER_STATUS } = require("../orders/order.constants");

// Messaging policy: free text is a privilege of a live agreement, not a
// default. Negotiation itself happens exclusively through offer actions
// (which enter the conversation as offer cards and bypass this policy).
//
// Text between a pair of users is allowed when:
//   - any order between them is not cancelled (active or completed deal -
//     they must coordinate handover, and post-sale contact stays open), or
//   - an accepted offer between them is still inside its checkout window
//     (deal agreed, order not created yet).
// Everything else - including all pre-agreement contact - is blocked, with a
// machine-readable reason so clients render "make an offer to chat".
//
// The check derives from live negotiation state on purpose: a cancelled deal
// re-locks the conversation automatically, with no stored flag to go stale.

const REASONS = Object.freeze({
  NEGOTIATION_REQUIRED: "negotiation_required",
});

const pairFilter = (userA, userB) => ({
  $or: [
    { buyer: userA, seller: userB },
    { buyer: userB, seller: userA },
  ],
});

// -> { allowed, reason? }
exports.canSendText = async ({ senderId, receiverId, senderRole }) => {
  // Support/admin outreach is exempt.
  if (senderRole === "admin") return { allowed: true };

  const [order, agreement] = await Promise.all([
    Order.exists({
      ...pairFilter(senderId, receiverId),
      status: { $ne: ORDER_STATUS.CANCELLED },
    }),
    Offer.exists({
      ...pairFilter(senderId, receiverId),
      status: OFFER_STATUS.ACCEPTED,
      order: { $exists: false },
      checkoutExpiresAt: { $gt: new Date() },
    }),
  ]);

  if (order || agreement) return { allowed: true };
  return { allowed: false, reason: REASONS.NEGOTIATION_REQUIRED };
};

exports.POLICY_REASONS = REASONS;
