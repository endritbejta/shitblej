const domainEvents = require("../../shared/events/domainEvents");
const notificationService = require("./notification.service");
const { OFFER_EVENTS } = require("../offers/offer.constants");
const { ORDER_EVENTS } = require("../orders/order.constants");

// Routing layer between domain facts and user-facing notifications.
// Producers never know notifications exist; this file owns "who cares about
// what". Offer payloads carry recipientId (the offers service knows
// negotiation semantics); order payloads are routed here by event type.

const notify = (recipient, type, data) =>
  notificationService
    .createNotification({ recipient, type, data })
    .catch((err) =>
      console.error(`Failed to create notification "${type}":`, err.message)
    );

const offerData = (payload) => ({
  offerId: payload.offerId,
  productId: payload.productId,
  productName: payload.productName,
  amountCents: payload.amountCents,
  currency: payload.currency,
  offerType: payload.type,
});

const orderData = (payload) => ({
  orderId: payload.orderId,
  orderNumber: payload.orderNumber,
  totalCents: payload.totalCents,
  currency: payload.currency,
});

let registered = false;

const register = () => {
  if (registered) return; // survives repeated require/registration in tests
  registered = true;

  // Negotiation
  domainEvents.on(OFFER_EVENTS.PLACED, (p) =>
    notify(p.recipientId, "offer.received", offerData(p))
  );
  domainEvents.on(OFFER_EVENTS.COUNTERED, (p) =>
    notify(p.recipientId, "offer.countered", offerData(p))
  );
  domainEvents.on(OFFER_EVENTS.ACCEPTED, (p) =>
    notify(p.recipientId, "offer.accepted", offerData(p))
  );
  domainEvents.on(OFFER_EVENTS.DECLINED, (p) =>
    notify(p.recipientId, "offer.declined", offerData(p))
  );
  domainEvents.on(OFFER_EVENTS.CANCELLED, (p) =>
    notify(p.recipientId, "offer.cancelled", offerData(p))
  );
  domainEvents.on(OFFER_EVENTS.EXPIRED, (p) =>
    notify(p.recipientId, "offer.expired", offerData(p))
  );
  domainEvents.on(OFFER_EVENTS.SUPERSEDED, (p) =>
    notify(p.recipientId, "offer.superseded", {
      ...offerData(p),
      supersededOfferId: p.supersededOfferId,
    })
  );

  // Order lifecycle. recipientId is set by the orders service (the party who
  // did NOT perform the action).
  domainEvents.on(ORDER_EVENTS.PLACED, (p) =>
    notify(p.recipientId, "order.created", orderData(p))
  );
  domainEvents.on(ORDER_EVENTS.SHIPPED, (p) =>
    notify(p.recipientId, "order.shipped", orderData(p))
  );
  domainEvents.on(ORDER_EVENTS.DELIVERED, (p) =>
    notify(p.recipientId, "order.delivered", orderData(p))
  );
  domainEvents.on(ORDER_EVENTS.CANCELLED, (p) =>
    notify(p.recipientId, "order.cancelled", orderData(p))
  );
};

module.exports = { register };
