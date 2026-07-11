// Negotiation amount rules. Pure functions, config at the top - the server
// owns these rules; the frontend only renders what /offers/options returns.
// Changing marketplace policy (floor, ceiling, suggestion shape) happens here
// and nowhere else.

const OFFER_RULES = Object.freeze({
  // An offer (or counter) must land within [minRatio, maxRatio] of the
  // asking price. The floor blocks insulting lowballs, which push users
  // off-platform; Buy Now covers paying full asking price.
  minRatio: 0.6,
  maxRatio: 1.0,

  // Suggested amounts shown as quick-pick chips: evenly spread across this
  // sub-range of the asking price, rounded to a friendly step.
  suggestionCount: 5,
  suggestionSpread: [0.75, 0.95],
  roundToCents: 500, // suggestions land on 5-euro steps
});

// Inclusive bounds for a valid proposal on a listing.
const offerBounds = (askingPriceCents) => ({
  minCents: Math.ceil(askingPriceCents * OFFER_RULES.minRatio),
  maxCents: Math.floor(askingPriceCents * OFFER_RULES.maxRatio),
});

const isWithinBounds = (amountCents, askingPriceCents) => {
  const { minCents, maxCents } = offerBounds(askingPriceCents);
  return amountCents >= minCents && amountCents <= maxCents;
};

// Quick-pick amounts for the client (e.g. asking 120.00 EUR ->
// [90.00, 95.00, 100.00, 105.00, 115.00]). Rounded, deduplicated, clamped to
// the bounds, ascending.
const suggestedAmounts = (askingPriceCents) => {
  const { minCents, maxCents } = offerBounds(askingPriceCents);
  const [lo, hi] = OFFER_RULES.suggestionSpread;
  const start = askingPriceCents * lo;
  const end = askingPriceCents * hi;
  const step = (end - start) / (OFFER_RULES.suggestionCount - 1);

  const values = new Set();
  for (let i = 0; i < OFFER_RULES.suggestionCount; i++) {
    const raw = start + step * i;
    const rounded =
      Math.round(raw / OFFER_RULES.roundToCents) * OFFER_RULES.roundToCents;
    const clamped = Math.min(Math.max(rounded, minCents), maxCents);
    values.add(clamped);
  }

  return [...values].sort((a, b) => a - b);
};

module.exports = { OFFER_RULES, offerBounds, isWithinBounds, suggestedAmounts };
