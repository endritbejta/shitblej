// Single source of truth for the order lifecycle.
//
// An order comes into existence ONLY at checkout of an accepted offer - the
// mutual agreement already happened in the offers domain, so there is no
// pending/accept/decline stage here. The state machine below drives the
// service (transition execution), the routes (one endpoint per action) and
// the tests.
//
//   ACCEPTED ---ship---> SHIPPED ---deliver---> DELIVERED
//       \-----cancel (buyer or seller)-----> CANCELLED
//
// DELIVERED and CANCELLED are terminal.

const ORDER_STATUS = Object.freeze({
  ACCEPTED: "accepted",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
});

// The role a user plays relative to a specific order (not their global role).
const ORDER_PARTY = Object.freeze({
  BUYER: "buyer",
  SELLER: "seller",
  ADMIN: "admin",
});

const PAYMENT_METHOD = Object.freeze({
  CASH: "cash",
  // Extension point: CARD once a payment provider is integrated. Provider
  // state (intents, charges) belongs in a payments module, not on the order.
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  // Extension point: REFUNDED, once refunds exist.
});

// Transition table. For each action:
//   from    - map of party -> statuses from which THAT party may perform it
//   to      - resulting status
//   effects - declarative side effects executed by the service:
//     releaseItems - reserved products return to "available"
//     sellItems    - reserved products become "sold"
//     settleCash   - cash-on-delivery is considered collected
const ORDER_ACTIONS = Object.freeze({
  cancel: {
    // Before shipment either side may back out; the item goes back on sale.
    from: {
      buyer: [ORDER_STATUS.ACCEPTED],
      seller: [ORDER_STATUS.ACCEPTED],
      admin: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.SHIPPED],
    },
    to: ORDER_STATUS.CANCELLED,
    effects: { releaseItems: true },
  },
  ship: {
    from: { seller: [ORDER_STATUS.ACCEPTED], admin: [ORDER_STATUS.ACCEPTED] },
    to: ORDER_STATUS.SHIPPED,
    effects: {},
  },
  deliver: {
    // The buyer confirms receipt; for cash-on-delivery this also settles
    // payment and finalizes the items as sold.
    from: { buyer: [ORDER_STATUS.SHIPPED], admin: [ORDER_STATUS.SHIPPED] },
    to: ORDER_STATUS.DELIVERED,
    effects: { sellItems: true, settleCash: true },
  },
});

// Domain events emitted after each successful state change. Payloads carry
// recipientId - the party who should be notified (the one who did not act).
const ORDER_EVENTS = Object.freeze({
  PLACED: "orders.placed",
  CANCELLED: "orders.cancelled",
  SHIPPED: "orders.shipped",
  DELIVERED: "orders.delivered",
});

const EVENT_BY_ACTION = Object.freeze({
  cancel: ORDER_EVENTS.CANCELLED,
  ship: ORDER_EVENTS.SHIPPED,
  deliver: ORDER_EVENTS.DELIVERED,
});

module.exports = {
  ORDER_STATUS,
  ORDER_PARTY,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ORDER_ACTIONS,
  ORDER_EVENTS,
  EVENT_BY_ACTION,
};
