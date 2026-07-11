const express = require("express");
const router = express.Router();

// Single mount point for every feature module. Adding a module means adding
// one line here — app.js never changes.
router.use("/products", require("../modules/products/product.routes"));
router.use("/users", require("../modules/users/user.routes"));
router.use("/messages", require("../modules/messages/message.routes"));
router.use("/saved-items", require("../modules/savedItems/savedItem.routes"));
router.use("/orders", require("../modules/orders/order.routes"));
router.use("/offers", require("../modules/offers/offer.routes"));
router.use("/notifications", require("../modules/notifications/notification.routes"));

module.exports = router;
