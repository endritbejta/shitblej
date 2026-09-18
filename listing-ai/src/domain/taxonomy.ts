/**
 * The listing vocabulary, mirrored from the marketplace backend.
 *
 * These values are not ours to invent. Every suggestion this service returns is
 * dropped into the Sell form and posted to `POST /api/v1/products`, where
 * `backend/src/modules/products/product.validation.js` rejects anything outside
 * these sets. A category this service makes up is not a bad suggestion, it is a
 * 400 the seller has to fix by hand.
 *
 * Duplicating the lists is deliberate: the backend is CommonJS and this service
 * is ESM TypeScript, so importing across the boundary would mean a build step
 * whose only job is to share two arrays. `tests/taxonomy.test.ts` instead reads
 * the backend's validation file and fails when the two drift, which makes this
 * a copy with a tripwire rather than a copy with a hope.
 */

export const CATEGORIES = [
  "ladies",
  "men",
  "designer-items",
  "children",
  "home",
  "electronics",
  "entertainment",
  "hobby-collector",
  "sport",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = [
  "New",
  "Used - Like New",
  "Used - Very Good",
  "Used - Good",
  "Used - Acceptable",
] as const;

export type Condition = (typeof CONDITIONS)[number];

/**
 * Field limits enforced by the Product model. The model is told about them in
 * the prompt and the normaliser clamps to them anyway - a model that writes a
 * 60-character title is a normal outcome to absorb, not an error to return.
 */
export const FIELD_LIMITS = {
  nameMaxLength: 50,
  descriptionMaxLength: 500,
} as const;

/**
 * Kosovo prices in euro. Held here as a constant rather than inlined so the
 * contract, the prompt and the normaliser cannot disagree about it.
 */
export const CURRENCY = "EUR" as const;
