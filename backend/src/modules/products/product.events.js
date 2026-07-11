// Domain events published by the products module. Kept in their own file so
// other modules can subscribe to the names without importing product services.
const PRODUCT_EVENTS = Object.freeze({
  DELETED: "products.deleted",
});

module.exports = { PRODUCT_EVENTS };
