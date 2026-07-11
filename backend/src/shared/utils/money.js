// Money helpers. All monetary amounts inside the orders domain are stored as
// integers in the currency's minor unit (cents) to avoid floating-point
// arithmetic errors. These helpers are the single conversion boundary between
// the legacy float prices (Product.price) and the integer world.

const eurosToCents = (euros) => {
  if (typeof euros !== "number" || !Number.isFinite(euros)) {
    throw new TypeError(`Cannot convert "${euros}" to cents`);
  }
  return Math.round(euros * 100);
};

const centsToEuros = (cents) => cents / 100;

module.exports = { eurosToCents, centsToEuros };
