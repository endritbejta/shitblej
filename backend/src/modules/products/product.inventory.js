const Product = require("./product.model");

const { PRODUCT_STATUS } = Product;

// Inventory operations for unique, quantity-one items.
//
// This is the ONLY place allowed to mutate Product.status. Other modules
// (orders today, disputes/returns tomorrow) go through these functions so the
// availability rules stay in one file.
//
// Concurrency model: each claim is a single-document atomic compare-and-swap
// (findOneAndUpdate with the expected current status in the filter), so two
// concurrent buyers can never both reserve the same item - one update matches,
// the other finds zero documents. Multi-item claims use compensation (release
// what was claimed) instead of multi-document transactions, which keeps the
// code correct on any MongoDB topology and avoids transaction lock contention.

// Atomically move one product from `available` to `reserved`.
// Resolves with the product document, or null when the product does not exist
// or is not available (caller decides how to report it).
const reserveProduct = (productId) =>
  Product.findOneAndUpdate(
    { _id: productId, status: PRODUCT_STATUS.AVAILABLE },
    { $set: { status: PRODUCT_STATUS.RESERVED } },
    { new: true }
  );

// All-or-nothing reservation of several products.
// Returns { reserved, failedIds }: when failedIds is non-empty every
// successful reservation has already been rolled back.
const reserveProducts = async (productIds) => {
  const results = await Promise.all(productIds.map(reserveProduct));

  const reserved = [];
  const failedIds = [];
  results.forEach((product, i) => {
    if (product) reserved.push(product);
    else failedIds.push(String(productIds[i]));
  });

  if (failedIds.length > 0 && reserved.length > 0) {
    await releaseProducts(reserved.map((p) => p._id));
  }

  return { reserved, failedIds };
};

// Move reserved products back to available (order declined / cancelled).
const releaseProducts = (productIds) =>
  Product.updateMany(
    { _id: { $in: productIds }, status: PRODUCT_STATUS.RESERVED },
    { $set: { status: PRODUCT_STATUS.AVAILABLE } }
  );

// Finalize reserved products as sold (order delivered).
const markProductsSold = (productIds) =>
  Product.updateMany(
    { _id: { $in: productIds }, status: PRODUCT_STATUS.RESERVED },
    { $set: { status: PRODUCT_STATUS.SOLD } }
  );

module.exports = {
  PRODUCT_STATUS,
  reserveProduct,
  reserveProducts,
  releaseProducts,
  markProductsSold,
};
