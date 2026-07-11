const asyncHandler = require("../../middleware/async");
const orderService = require("./order.service");

// Controllers translate HTTP to service calls and nothing else. Every
// lifecycle endpoint funnels into the same service method with a different
// action name - the state machine in order.constants.js decides legality.

// One factory covers all five lifecycle actions instead of five near-identical
// handlers.
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

// @desc    Place an order
// @route   POST /api/v1/orders
// @access  Private (buyer)
exports.placeOrder = asyncHandler(async (req, res) => {
  const { order, replayed } = await orderService.placeOrder({
    buyer: req.user,
    productIds: req.body.items,
    shippingAddress: req.body.shippingAddress,
    note: req.body.note,
    idempotencyKey: req.body.idempotencyKey,
  });

  // A replayed idempotent request returns the original order with 200.
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
// @route   POST /api/v1/orders/:id/{accept|decline|cancel|ship|deliver}
// @access  Private (party-dependent, enforced by the state machine)
exports.acceptOrder = actionHandler("accept");
exports.declineOrder = actionHandler("decline");
exports.cancelOrder = actionHandler("cancel");
exports.shipOrder = actionHandler("ship");
exports.deliverOrder = actionHandler("deliver");
