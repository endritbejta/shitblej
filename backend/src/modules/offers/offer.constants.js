// Single source of truth for the negotiation lifecycle.
//
// An offer is a PROPOSAL from one party to the other. Exactly one party (the
// recipient of the current proposal) can act on it. A counter never edits the
// existing offer - it closes it as "countered" and creates a new offer with
// the roles flipped, forming an immutable chain. Old offers can therefore
// never become active again by construction.
//
//   pending --accept--->  accepted  (reserves the product, rivals auto-declined)
//   pending --decline-->  declined
//   pending --counter-->  countered (a new pending offer is created)
//   pending --cancel--->  cancelled (only the proposer, backing out)
//   pending --timeout-->  expired
//   accepted --timeout--> expired   (buyer never checked out; product released)

const OFFER_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  COUNTERED: "countered",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

// Buy Now is an offer at the asking price: one pipeline, and the seller must
// consent to every sale - a buyer can never force an order into existence.
const OFFER_TYPE = Object.freeze({
  BUY_NOW: "buy_now",
  OFFER: "offer",
});

const OFFER_PARTY = Object.freeze({
  BUYER: "buyer",
  SELLER: "seller",
});

// How long a proposal waits for a response, and how long an accepted
// agreement holds the reservation while the buyer completes checkout.
const OFFER_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CHECKOUT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// Domain events. Every payload carries recipientId - the service, which owns
// the negotiation semantics, decides who must be told; subscribers only route.
const OFFER_EVENTS = Object.freeze({
  PLACED: "offers.placed",
  COUNTERED: "offers.countered",
  ACCEPTED: "offers.accepted",
  DECLINED: "offers.declined",
  CANCELLED: "offers.cancelled",
  EXPIRED: "offers.expired",
  // Rival pending offers auto-declined because the seller accepted another.
  SUPERSEDED: "offers.superseded",
});

module.exports = {
  OFFER_STATUS,
  OFFER_TYPE,
  OFFER_PARTY,
  OFFER_TTL_MS,
  CHECKOUT_TTL_MS,
  OFFER_EVENTS,
};
