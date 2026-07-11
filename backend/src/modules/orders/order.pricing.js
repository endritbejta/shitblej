// Order pricing calculator.
//
// Pure functions over integer cents: no I/O, no mongoose, fully unit-testable.
// This file is the extension point for coupons, taxes and promotions - each
// becomes another pure step in quoteFromAgreement(), and the order stores the
// resulting breakdown. Client-submitted amounts are never trusted; the price
// comes from the accepted offer, the snapshot from the product document.

// Marketplace take rate. 0 today; when monetization starts this becomes
// config- or seller-tier-driven. Recorded per order either way so payouts
// and revenue reporting have a complete ledger from day one.
const PLATFORM_FEE_RATE = 0;

// Sellers hand items over in person or arrange delivery themselves, so the
// platform charges no shipping today. When shipping providers are integrated,
// this becomes a lookup by seller/destination/provider.
const calculateShippingCents = () => 0;

const calculateFeeCents = (subtotalCents) =>
  Math.round(subtotalCents * PLATFORM_FEE_RATE);

// Build the priced order from the agreement: the product supplies the
// snapshot, the accepted offer supplies the price.
const quoteFromAgreement = ({ product, agreedAmountCents }) => {
  const items = [
    {
      product: product._id,
      name: product.name,
      image: product.images && product.images[0],
      unitPriceCents: agreedAmountCents,
    },
  ];

  const subtotalCents = agreedAmountCents;
  const shippingCents = calculateShippingCents();
  const feeCents = calculateFeeCents(subtotalCents);

  return {
    items,
    currency: "EUR",
    subtotalCents,
    shippingCents,
    feeCents,
    sellerNetCents: subtotalCents - feeCents,
    totalCents: subtotalCents + shippingCents,
  };
};

module.exports = { quoteFromAgreement, calculateShippingCents, PLATFORM_FEE_RATE };
