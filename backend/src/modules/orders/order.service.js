const Order = require("./order.model");
const pricing = require("./order.pricing");
const inventory = require("../products/product.inventory");
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

const PARTY_POPULATE = [
  { path: "buyer", select: "name image" },
  { path: "seller", select: "name image" },
];

// Extract a stable id string from a field that may or may not be populated
// (a raw ObjectId or a populated User document).
const idOf = (ref) => String(ref && ref._id ? ref._id : ref);

// Resolve the role a user plays on a given order, or null for strangers.
// Global admins act as the ADMIN party on any order.
const resolveParty = (order, user) => {
  if (user.role === "admin") return ORDER_PARTY.ADMIN;
  if (idOf(order.buyer) === user.id) return ORDER_PARTY.BUYER;
  if (idOf(order.seller) === user.id) return ORDER_PARTY.SELLER;
  return null;
};

const emitOrderEvent = (eventName, order) => {
  domainEvents.publish(eventName, {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    buyerId: idOf(order.buyer),
    sellerId: idOf(order.seller),
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
  });
};

// @desc Place an order: atomically reserve every item, price it server-side,
// and persist the contract between buyer and seller.
//
// Failure handling is compensating: any step after reservation that fails
// releases the reserved items before rethrowing, so a failed placement never
// leaves products stuck in "reserved".
exports.placeOrder = async ({
  buyer,
  productIds,
  shippingAddress,
  note,
  idempotencyKey,
}) => {
  // Idempotent replay: same buyer + key returns the original order without
  // touching inventory again.
  if (idempotencyKey) {
    const existing = await Order.findOne({
      buyer: buyer.id,
      idempotencyKey,
    }).populate(PARTY_POPULATE);
    if (existing) return { order: existing, replayed: true };
  }

  const { reserved, failedIds } = await inventory.reserveProducts(productIds);
  if (failedIds.length > 0) {
    // A concurrent retry with the same idempotency key may lose the
    // reservation race to its own sibling request - replay, don't fail.
    if (idempotencyKey) {
      const existing = await Order.findOne({
        buyer: buyer.id,
        idempotencyKey,
      }).populate(PARTY_POPULATE);
      if (existing) return { order: existing, replayed: true };
    }
    throw new ErrorResponse(
      `These products are unavailable or no longer exist: ${failedIds.join(", ")}`,
      409
    );
  }

  const releaseAndThrow = async (err) => {
    await inventory.releaseProducts(reserved.map((p) => p._id));
    throw err;
  };

  // Domain invariants that require the product documents.
  if (reserved.some((p) => !p.user)) {
    return releaseAndThrow(
      new ErrorResponse("These products cannot be ordered (no seller)", 409)
    );
  }
  const sellerIds = new Set(reserved.map((p) => String(p.user)));
  if (sellerIds.size > 1) {
    return releaseAndThrow(
      new ErrorResponse(
        "All items in an order must belong to the same seller. Place one order per seller.",
        400
      )
    );
  }
  const [sellerId] = sellerIds;
  if (sellerId === buyer.id) {
    return releaseAndThrow(
      new ErrorResponse("You cannot order your own products", 400)
    );
  }

  try {
    const order = await Order.create({
      buyer: buyer.id,
      seller: sellerId,
      ...pricing.quote(reserved),
      shippingAddress,
      note,
      idempotencyKey,
      paymentMethod: PAYMENT_METHOD.CASH,
      statusHistory: [
        {
          status: ORDER_STATUS.PENDING,
          by: buyer.id,
          party: ORDER_PARTY.BUYER,
        },
      ],
    });

    await order.populate(PARTY_POPULATE);
    emitOrderEvent(ORDER_EVENTS.PLACED, order);
    return { order, replayed: false };
  } catch (err) {
    // Duplicate idempotency key in a race: the first request won - replay it.
    if (err.code === 11000 && idempotencyKey) {
      await inventory.releaseProducts(reserved.map((p) => p._id));
      const existing = await Order.findOne({
        buyer: buyer.id,
        idempotencyKey,
      }).populate(PARTY_POPULATE);
      if (existing) return { order: existing, replayed: true };
    }
    return releaseAndThrow(err);
  }
};

// @desc Execute a lifecycle action (accept/decline/cancel/ship/deliver).
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
    throw new ErrorResponse(
      `The ${party} cannot ${action} an order`,
      403
    );
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
  if (definition.effects.settleCash && order.paymentMethod === PAYMENT_METHOD.CASH) {
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

  emitOrderEvent(EVENT_BY_ACTION[action], updated);
  return updated;
};

// Shared implementation for the two list views - identical shape, different
// party field.
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
