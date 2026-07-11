const { eurosToCents } = require("../../shared/utils/money");

// Order pricing calculator.
//
// Pure functions over integer cents: no I/O, no mongoose, fully unit-testable.
// This file is the extension point for coupons, taxes and promotions - each
// becomes another pure step in quote(), and the order stores the resulting
// breakdown. Client-submitted amounts are never trusted; the service always
// prices from the reserved product documents.

// Sellers hand items over in person or arrange delivery themselves, so the
// platform charges no shipping today. When shipping providers are integrated,
// this becomes a lookup by seller/destination/provider.
const calculateShippingCents = () => 0;

// Build the priced order lines and totals from reserved product documents.
const quote = (products) => {
  const items = products.map((product) => ({
    product: product._id,
    name: product.name,
    image: product.images && product.images[0],
    unitPriceCents: eurosToCents(product.price),
  }));

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents,
    0
  );
  const shippingCents = calculateShippingCents();

  return {
    items,
    currency: "EUR",
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
};

module.exports = { quote, calculateShippingCents };
