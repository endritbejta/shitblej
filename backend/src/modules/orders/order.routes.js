const express = require("express");
const router = express.Router();
const {
  placeOrder,
  listPurchases,
  listSales,
  getOrder,
  acceptOrder,
  declineOrder,
  cancelOrder,
  shipOrder,
  deliverOrder,
} = require("./order.controller");
const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  placeOrderSchema,
  orderIdParamSchema,
  actionSchema,
  shipSchema,
  listOrdersSchema,
} = require("./order.validation");

// Every order route requires an authenticated user; per-order authorization
// (buyer vs seller vs admin) is enforced in the service via the state machine.
router.use(protect);

// @route   POST /api/v1/orders
router.post("/", validate(placeOrderSchema), placeOrder);

// Named list views - declared before "/:id" so they are not captured as ids.
// @route   GET /api/v1/orders/purchases
// @route   GET /api/v1/orders/sales
router.get("/purchases", validate(listOrdersSchema), listPurchases);
router.get("/sales", validate(listOrdersSchema), listSales);

// @route   GET /api/v1/orders/:id
router.get("/:id", validate(orderIdParamSchema), getOrder);

// Lifecycle actions as explicit endpoints (not a generic PATCH status): each
// is independently discoverable, documentable and rate-limitable, while the
// shared state machine keeps them consistent.
// @route   POST /api/v1/orders/:id/accept   (seller)
// @route   POST /api/v1/orders/:id/decline  (seller)
// @route   POST /api/v1/orders/:id/cancel   (buyer: pending, seller: accepted)
// @route   POST /api/v1/orders/:id/ship     (seller)
// @route   POST /api/v1/orders/:id/deliver  (buyer)
router.post("/:id/accept", validate(actionSchema), acceptOrder);
router.post("/:id/decline", validate(actionSchema), declineOrder);
router.post("/:id/cancel", validate(actionSchema), cancelOrder);
router.post("/:id/ship", validate(shipSchema), shipOrder);
router.post("/:id/deliver", validate(actionSchema), deliverOrder);

module.exports = router;
