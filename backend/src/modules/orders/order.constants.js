// Single source of truth for the order lifecycle.
//
// The state machine below drives the service (transition execution), the
// routes (one endpoint per action), and the tests. Adding a future capability
// (returns, disputes, refunds) means adding a status + an action entry here -
// no scattered if-statements to hunt down.
//
// Lifecycle:
//
//   PENDING ---accept--->  ACCEPTED ---ship--->  SHIPPED ---deliver---> DELIVERED
//     |  \--decline--> DECLINED         \--cancel(seller)--> CANCELLED
//     \---cancel(buyer)--> CANCELLED
//
// DELIVERED, DECLINED and CANCELLED are terminal.

const ORDER_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  DECLINED: "declined",
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
  // Extension point: CARD: "card" once a payment provider is integrated.
  // Provider-specific state (intents, charges) belongs in a payments module,
  // not on the order - the order only tracks method + settlement status.
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  // Extension point: REFUNDED, once refunds exist.
});

// Transition table. For each action:
//   from    - map of party -> statuses from which THAT party may perform it
//             (admin can act wherever any party can, plus its own entries)
//   to      - resulting status
//   effects - declarative side effects executed by the service:
//     releaseItems  - reserved products return to "available"
//     sellItems     - reserved products become "sold"
//     settleCash    - cash-on-delivery is considered collected
const ORDER_ACTIONS = Object.freeze({
  accept: {
    from: { seller: [ORDER_STATUS.PENDING], admin: [ORDER_STATUS.PENDING] },
    to: ORDER_STATUS.ACCEPTED,
    effects: {},
  },
  decline: {
    from: { seller: [ORDER_STATUS.PENDING], admin: [ORDER_STATUS.PENDING] },
    to: ORDER_STATUS.DECLINED,
    effects: { releaseItems: true },
  },
  cancel: {
    // A buyer may back out while the seller has not committed; a seller may
    // cancel after accepting when they can no longer fulfil.
    from: {
      buyer: [ORDER_STATUS.PENDING],
      seller: [ORDER_STATUS.ACCEPTED],
      admin: [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED],
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

// Domain events emitted after each successful state change.
const ORDER_EVENTS = Object.freeze({
  PLACED: "orders.placed",
  ACCEPTED: "orders.accepted",
  DECLINED: "orders.declined",
  CANCELLED: "orders.cancelled",
  SHIPPED: "orders.shipped",
  DELIVERED: "orders.delivered",
});

// Event emitted for each action (placement emits PLACED separately).
const EVENT_BY_ACTION = Object.freeze({
  accept: ORDER_EVENTS.ACCEPTED,
  decline: ORDER_EVENTS.DECLINED,
  cancel: ORDER_EVENTS.CANCELLED,
  ship: ORDER_EVENTS.SHIPPED,
  deliver: ORDER_EVENTS.DELIVERED,
});

const MAX_ITEMS_PER_ORDER = 20;

module.exports = {
  ORDER_STATUS,
  ORDER_PARTY,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ORDER_ACTIONS,
  ORDER_EVENTS,
  EVENT_BY_ACTION,
  MAX_ITEMS_PER_ORDER,
};
