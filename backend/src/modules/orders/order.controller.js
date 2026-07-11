const asyncHandler = require("../../middleware/async");
const orderService = require("./order.service");

// Controllers translate HTTP to service calls and nothing else. Lifecycle
// endpoints funnel into the same service method with a different action name
// - the state machine in order.constants.js decides legality.

const actionHandler = (action) =>
  asyncHandler(async (req, res) => {
    const order = await orderService.performAction({
      orderId: req.params.id,
      action,
      user: req.user,
      note: req.body.note,
      shipment:
        action === "ship"
          ? {
              carrier: req.body.carrier,
              trackingNumber: req.body.trackingNumber,
            }
          : undefined,
    });

    res.status(200).json({ success: true, data: order });
  });

// @desc    Checkout an accepted offer into an order
// @route   POST /api/v1/orders
// @access  Private (the offer's buyer)
exports.checkout = asyncHandler(async (req, res) => {
  const { order, replayed } = await orderService.checkout({
    buyer: req.user,
    offerId: req.body.offer,
    shippingAddress: req.body.shippingAddress,
    note: req.body.note,
  });

  // A replayed (idempotent) checkout returns the original order with 200.
  res.status(replayed ? 200 : 201).json({ success: true, data: order });
});

// @desc    List orders I placed
// @route   GET /api/v1/orders/purchases
// @access  Private
exports.listPurchases = asyncHandler(async (req, res) => {
  const { orders, count, pagination } = await orderService.listPurchases(
    req.user.id,
    req.query
  );
  res.status(200).json({ success: true, count, pagination, data: orders });
});

// @desc    List orders I received as a seller
// @route   GET /api/v1/orders/sales
// @access  Private
exports.listSales = asyncHandler(async (req, res) => {
  const { orders, count, pagination } = await orderService.listSales(
    req.user.id,
    req.query
  );
  res.status(200).json({ success: true, count, pagination, data: orders });
});

// @desc    Get one order (buyer, seller or admin only)
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderForUser({
    orderId: req.params.id,
    user: req.user,
  });
  res.status(200).json({ success: true, data: order });
});

// @desc    Lifecycle actions
// @route   POST /api/v1/orders/:id/{cancel|ship|deliver}
// @access  Private (party-dependent, enforced by the state machine)
exports.cancelOrder = actionHandler("cancel");
exports.shipOrder = actionHandler("ship");
exports.deliverOrder = actionHandler("deliver");
