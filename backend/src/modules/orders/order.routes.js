const express = require("express");
const router = express.Router();
const {
  checkout,
  listPurchases,
  listSales,
  getOrder,
  cancelOrder,
  shipOrder,
  deliverOrder,
} = require("./order.controller");
const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  checkoutSchema,
  orderIdParamSchema,
  actionSchema,
  shipSchema,
  listOrdersSchema,
} = require("./order.validation");

// Every order route requires an authenticated user; per-order authorization
// (buyer vs seller vs admin) is enforced in the service via the state machine.
router.use(protect);

// Checkout: the ONLY way an order is created, and it requires an accepted
// offer. There is no direct "place order" endpoint by design.
// @route   POST /api/v1/orders
router.post("/", validate(checkoutSchema), checkout);

// Named list views - declared before "/:id" so they are not captured as ids.
// @route   GET /api/v1/orders/purchases
// @route   GET /api/v1/orders/sales
router.get("/purchases", validate(listOrdersSchema), listPurchases);
router.get("/sales", validate(listOrdersSchema), listSales);

// @route   GET /api/v1/orders/:id
router.get("/:id", validate(orderIdParamSchema), getOrder);

// Lifecycle actions. Accept/decline no longer exist here - consent happens in
// the offers domain before the order can exist.
// @route   POST /api/v1/orders/:id/cancel   (buyer or seller, before shipment)
// @route   POST /api/v1/orders/:id/ship     (seller)
// @route   POST /api/v1/orders/:id/deliver  (buyer)
router.post("/:id/cancel", validate(actionSchema), cancelOrder);
router.post("/:id/ship", validate(shipSchema), shipOrder);
router.post("/:id/deliver", validate(actionSchema), deliverOrder);

module.exports = router;
