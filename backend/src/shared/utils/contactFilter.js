// Contact-information detector for user-written content (chat text, offer
// notes). Defense-in-depth behind the negotiation gate: conservative patterns
// to keep false positives low. This is an arms race by nature - the policy
// gate is the primary control, this catches the casual cases.

const PATTERNS = [
  // Email addresses
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  // Phone numbers: international or local, 8+ digits allowing separators
  /(\+|00)?\d[\d\s().-]{7,}\d/,
  // Off-platform channels by name
  /\b(whats\s?app|viber|telegram|instagram|snapchat|facebook|messenger|tiktok)\b/i,
  // Social handles like @someone (word boundary keeps emails caught above)
  /(^|\s)@[a-z0-9_.]{3,}/i,
];

// Returns true when the text appears to contain contact details.
const containsContactInfo = (text) => {
  if (!text) return false;
  return PATTERNS.some((pattern) => pattern.test(text));
};

module.exports = { containsContactInfo };
