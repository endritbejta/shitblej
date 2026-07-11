const Order = require("./order.model");
const pricing = require("./order.pricing");
const inventory = require("../products/product.inventory");
const Product = require("../products/product.model");
const offerService = require("../offers/offer.service");
const Offer = require("../offers/offer.model");
const ErrorResponse = require("../../shared/utils/errorResponse");
const domainEvents = require("../../shared/events/domainEvents");
const {
  parsePagination,
  buildPageLinks,
} = require("../../shared/utils/paginate");
const {
  ORDER_STATUS,
  ORDER_PARTY,
  ORDER_ACTIONS,
  ORDER_EVENTS,
  EVENT_BY_ACTION,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} = require("./order.constants");
const { OFFER_STATUS } = require("../offers/offer.constants");

const PARTY_POPULATE = [
  { path: "buyer", select: "name image" },
  { path: "seller", select: "name image" },
];

// Extract a stable id string from a field that may or may not be populated.
const idOf = (ref) => String(ref && ref._id ? ref._id : ref);

// Resolve the role a user plays on a given order, or null for strangers.
const resolveParty = (order, user) => {
  if (user.role === "admin") return ORDER_PARTY.ADMIN;
  if (idOf(order.buyer) === user.id) return ORDER_PARTY.BUYER;
  if (idOf(order.seller) === user.id) return ORDER_PARTY.SELLER;
  return null;
};

const emitOrderEvent = (eventName, order, recipientId) => {
  domainEvents.publish(eventName, {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    buyerId: idOf(order.buyer),
    sellerId: idOf(order.seller),
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
    recipientId: String(recipientId),
  });
};

// @desc Checkout: turn an accepted offer into an order. This is the ONLY way
// an order comes into existence - the offer IS the agreement, the product was
// reserved when the offer was accepted, and the price is the agreed amount.
exports.checkout = async ({ buyer, offerId, shippingAddress, note }) => {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new ErrorResponse(`Offer not found with id of ${offerId}`, 404);
  }
  if (String(offer.buyer) !== buyer.id) {
    throw new ErrorResponse("Only the buyer of this offer can check out", 403);
  }

  // Idempotent replay: this offer already produced an order.
  if (offer.order) {
    const existing = await Order.findById(offer.order).populate(PARTY_POPULATE);
    if (existing) return { order: existing, replayed: true };
  }

  if (offer.status !== OFFER_STATUS.ACCEPTED) {
    throw new ErrorResponse(
      `Checkout requires an accepted offer (this one is ${offer.status})`,
      409
    );
  }

  // Lazy checkout-window expiry: release the item if the agreement went stale.
  if (offer.checkoutExpiresAt && offer.checkoutExpiresAt <= new Date()) {
    const expired = await Offer.findOneAndUpdate(
      { _id: offer._id, status: OFFER_STATUS.ACCEPTED, order: { $exists: false } },
      { $set: { status: OFFER_STATUS.EXPIRED } },
      { new: true }
    );
    if (expired) await inventory.releaseProducts([offer.product]);
    throw new ErrorResponse(
      "The checkout window for this agreement has expired",
      409
    );
  }

  // The product document supplies the snapshot; the offer supplies the price.
  const product = await Product.findById(offer.product);
  if (!product) {
    throw new ErrorResponse(
      "The product for this agreement no longer exists",
      409
    );
  }

  let order;
  try {
    order = await Order.create({
      sourceOffer: offer._id,
      buyer: buyer.id,
      seller: offer.seller,
      ...pricing.quoteFromAgreement({
        product,
        agreedAmountCents: offer.amountCents,
      }),
      shippingAddress,
      note,
      paymentMethod: PAYMENT_METHOD.CASH,
      statusHistory: [
        {
          status: ORDER_STATUS.ACCEPTED,
          by: buyer.id,
          party: ORDER_PARTY.BUYER,
        },
      ],
    });
  } catch (err) {
    // Concurrent checkout of the same offer: the unique sourceOffer index
    // guarantees one winner - replay the winner for the loser.
    if (err.code === 11000) {
      const existing = await Order.findOne({ sourceOffer: offer._id }).populate(
        PARTY_POPULATE
      );
      if (existing) return { order: existing, replayed: true };
    }
    throw err;
  }

  // Consume the offer (records the order on it). CAS-guarded in the offers
  // service; a failure here cannot un-create the order, so we do not throw.
  await offerService.consumeAcceptedOffer({
    offerId: offer._id,
    buyerId: buyer.id,
    orderId: order._id,
  });

  await order.populate(PARTY_POPULATE);
  emitOrderEvent(ORDER_EVENTS.PLACED, order, idOf(order.seller));
  return { order, replayed: false };
};

// @desc Execute a lifecycle action (cancel/ship/deliver).
//
// Authorization and legality both come from the ORDER_ACTIONS table. The
// status write is an atomic compare-and-swap on the current status, so two
// concurrent transitions can never both succeed.
exports.performAction = async ({ orderId, action, user, note, shipment }) => {
  const definition = ORDER_ACTIONS[action];
  if (!definition) {
    throw new ErrorResponse(`Unknown order action: ${action}`, 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ErrorResponse(`Order not found with id of ${orderId}`, 404);
  }

  const party = resolveParty(order, user);
  if (!party) {
    throw new ErrorResponse("Not authorized to access this order", 403);
  }

  const allowedFrom = definition.from[party];
  if (!allowedFrom) {
    throw new ErrorResponse(`The ${party} cannot ${action} an order`, 403);
  }
  if (!allowedFrom.includes(order.status)) {
    throw new ErrorResponse(
      `Cannot ${action} an order in status "${order.status}"`,
      409
    );
  }

  const update = {
    $set: { status: definition.to },
    $push: {
      statusHistory: { status: definition.to, by: user.id, party, note },
    },
  };
  if (action === "ship" && shipment) {
    update.$set["shipment.carrier"] = shipment.carrier;
    update.$set["shipment.trackingNumber"] = shipment.trackingNumber;
  }
  if (
    definition.effects.settleCash &&
    order.paymentMethod === PAYMENT_METHOD.CASH
  ) {
    update.$set.paymentStatus = PAYMENT_STATUS.PAID;
  }

  // Compare-and-swap on the status we just validated: if a concurrent request
  // changed it in the meantime, this matches nothing and we report a conflict.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    update,
    { new: true, runValidators: true }
  ).populate(PARTY_POPULATE);

  if (!updated) {
    throw new ErrorResponse(
      "The order was modified by another request. Reload and try again.",
      409
    );
  }

  const productIds = updated.items.map((item) => item.product);
  if (definition.effects.releaseItems) {
    await inventory.releaseProducts(productIds);
  }
  if (definition.effects.sellItems) {
    await inventory.markProductsSold(productIds);
  }

  // Notify the counterpart of whoever acted (admin actions notify the buyer).
  const recipientId =
    party === ORDER_PARTY.SELLER ? idOf(updated.buyer) : idOf(updated.seller);
  emitOrderEvent(EVENT_BY_ACTION[action], updated, recipientId);
  return updated;
};

// Shared implementation for the two list views.
const listOrdersFor = async (partyField, userId, rawQuery) => {
  const filter = { [partyField]: userId };
  if (rawQuery.status) filter.status = rawQuery.status;

  const { page, limit, skip } = parsePagination(rawQuery);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate(PARTY_POPULATE),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    count: orders.length,
    total,
    pagination: buildPageLinks({
      page,
      limit,
      skip,
      total,
      returned: orders.length,
    }),
  };
};

// @desc Orders the user placed (as buyer).
exports.listPurchases = (userId, rawQuery = {}) =>
  listOrdersFor("buyer", userId, rawQuery);

// @desc Orders the user received (as seller).
exports.listSales = (userId, rawQuery = {}) =>
  listOrdersFor("seller", userId, rawQuery);

// @desc Fetch a single order; only its parties (or an admin) may see it.
exports.getOrderForUser = async ({ orderId, user }) => {
  const order = await Order.findById(orderId).populate(PARTY_POPULATE);
  if (!order) {
    throw new ErrorResponse(`Order not found with id of ${orderId}`, 404);
  }
  if (!resolveParty(order, user)) {
    throw new ErrorResponse("Not authorized to access this order", 403);
  }
  return order;
};
