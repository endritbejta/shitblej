/**
 * The service contract: what callers send, and what they can rely on getting
 * back. Everything crossing the HTTP boundary is described here so a consumer
 * only has to read one file to integrate.
 *
 * There are deliberately two output shapes:
 *
 *   modelDraftSchema  - what we ask Claude for. Permissive on purpose: no length
 *                       caps, no ordering rules. If the model writes a 70-char
 *                       title we want that draft in hand so the normaliser can
 *                       trim it, not a parse failure that loses the whole call.
 *   suggestionSchema  - what we return. Every backend constraint holds here.
 *
 * `normalizeDraft` in ../analyze/normalize.ts is the only bridge between them.
 */

import { z } from "zod";
import { CATEGORIES, CONDITIONS, CURRENCY } from "../domain/taxonomy.js";

/* -------------------------------------------------------------------------- */
/* Request                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Formats the vision API accepts. Kept narrow rather than waving through any
 * `image/*` so an unsupported type fails here, with a clear message, instead of
 * as a 400 from the model API halfway through a paid request.
 */
export const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * A photo arrives one of two ways, and both are real cases:
 *
 *   base64 - the Sell form, where the seller has picked a file but not yet
 *            submitted it. Nothing has been uploaded to Cloudinary at this
 *            point, so there is no URL to hand us.
 *   url    - re-analysing an existing listing, where the image is already
 *            hosted and sending the bytes again would be wasteful.
 */
export const imageInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("base64"),
    mediaType: z.enum(SUPPORTED_MEDIA_TYPES),
    /** Raw base64, no `data:` prefix. Size is checked against config at the route. */
    data: z.string().min(1, "Image data is empty"),
  }),
  z.object({
    kind: z.literal("url"),
    url: z.url("Image URL must be a valid URL"),
  }),
]);

export const suggestRequestSchema = z.object({
  image: imageInputSchema,
  /**
   * Anything the seller has already typed. Cheap to pass through and it
   * measurably helps: "Nike Air Max 90, size 42" turns a guess about a shoe
   * into a specific listing. Capped so it cannot become a prompt-injection
   * surface of unbounded size.
   */
  hint: z.string().trim().max(200).optional(),
});

export type SuggestRequest = z.infer<typeof suggestRequestSchema>;
export type ImageInput = z.infer<typeof imageInputSchema>;

/* -------------------------------------------------------------------------- */
/* What we ask the model for                                                   */
/* -------------------------------------------------------------------------- */

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const modelDraftSchema = z.object({
  /** True when the photo actually shows a sellable item. See the prompt. */
  itemIdentified: z.boolean(),
  name: z.string(),
  description: z.string(),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
  /** Null rather than optional - an explicit "no brand visible" beats a missing key. */
  brand: z.string().nullable(),
  size: z.string().nullable(),
  priceLow: z.number(),
  priceSuggested: z.number(),
  priceHigh: z.number(),
  priceConfidence: z.enum(CONFIDENCE_LEVELS),
  /** The model's own caveats, surfaced to the seller as warnings. */
  notes: z.array(z.string()),
});

export type ModelDraft = z.infer<typeof modelDraftSchema>;

/* -------------------------------------------------------------------------- */
/* What we return                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Where a price came from.
 *
 * Today this is always `model_estimate`: the marketplace holds ~31 listings,
 * three or four per category, and a "similar items sold for X" figure computed
 * from three comparables would be precision the data cannot support. Sellers
 * price real possessions off these numbers, so the honest move is to say the
 * band is an estimate and let the UI label it that way.
 *
 * `comparable_sales` exists now so the field is part of the contract from the
 * first release. When there are enough closed orders to support it, the
 * comparables path fills in `comparablesUsed` and flips this value - consumers
 * already branch on it, so nothing downstream has to change.
 */
export const PRICE_BASES = ["model_estimate", "comparable_sales"] as const;
export type PriceBasis = (typeof PRICE_BASES)[number];

export const priceSuggestionSchema = z.object({
  low: z.number().positive(),
  suggested: z.number().positive(),
  high: z.number().positive(),
  currency: z.literal(CURRENCY),
  basis: z.enum(PRICE_BASES),
  /** Zero while `basis` is `model_estimate`. Present so the UI can say "based on N sales". */
  comparablesUsed: z.number().int().nonnegative(),
  confidence: z.enum(CONFIDENCE_LEVELS),
});

export type PriceSuggestion = z.infer<typeof priceSuggestionSchema>;

export const suggestionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
  /** Omitted entirely when not detected, so `??` and optional chaining behave. */
  brand: z.string().min(1).optional(),
  size: z.string().min(1).optional(),
  price: priceSuggestionSchema,
  /**
   * Anything the seller should look at before posting - an unclear photo, a
   * title that had to be trimmed, a low-confidence price. Always present, often
   * empty. A consumer that ignores it still gets a valid listing.
   */
  warnings: z.array(z.string()),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

export const suggestResponseSchema = z.object({
  suggestion: suggestionSchema,
  meta: z.object({
    /** True when this came from the cache, so the caller knows it cost nothing. */
    cached: z.boolean(),
    model: z.string(),
    /** Round-trip in milliseconds, measured at the route. */
    latencyMs: z.number().int().nonnegative(),
  }),
});

export type SuggestResponse = z.infer<typeof suggestResponseSchema>;
