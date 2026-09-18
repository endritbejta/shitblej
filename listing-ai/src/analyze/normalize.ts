/**
 * Turns a model draft into a suggestion the marketplace will accept.
 *
 * This is the only place that bridges "what Claude wrote" and "what
 * POST /api/v1/products validates", and it is deliberately pure: no clock, no
 * network, no config. Everything here is exercised by unit tests with no API
 * key, which is what makes the awkward cases - a 70-character title, a price
 * range the model returned backwards - cheap to pin down and keep pinned.
 *
 * The guiding rule is that a recoverable oddity produces a warning, never an
 * error. The seller is looking at an editable form; handing them a slightly
 * trimmed title with a note beats handing them a failure.
 */

import {
  CURRENCY,
  FIELD_LIMITS,
  type Category,
} from "../domain/taxonomy.js";
import type { ModelDraft, Suggestion } from "../contracts/suggestion.js";

/**
 * Below this, a word-boundary trim has cut away so much that a hard cut at the
 * limit preserves more meaning. Only bites on pathological input - a title with
 * no spaces in its first 50 characters.
 */
const MIN_WORD_BOUNDARY_RATIO = 0.6;

/** Cheapest listing worth posting. Also keeps `priceSuggestionSchema.positive()` satisfiable. */
const MIN_PRICE = 1;

type ClampedText = {
  text: string;
  truncated: boolean;
};

/**
 * Trims to `maxLength`, preferring to break at a word boundary. No ellipsis:
 * the result lands in an editable input, where a trailing "…" is something the
 * seller has to delete rather than a hint that anything was cut.
 */
export function clampText(value: string, maxLength: number): ClampedText {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return { text: trimmed, truncated: false };
  }

  const hardCut = trimmed.slice(0, maxLength);

  // When the character just past the limit is whitespace, the hard cut already
  // ends on a word boundary - backing off to the previous space here would throw
  // away a word that fit exactly.
  const cutLandsOnBoundary = /\s/u.test(trimmed.charAt(maxLength));

  const lastSpace = hardCut.lastIndexOf(" ");
  const keepWholeWords = lastSpace >= maxLength * MIN_WORD_BOUNDARY_RATIO;

  const cut =
    cutLandsOnBoundary || !keepWholeWords ? hardCut : hardCut.slice(0, lastSpace);

  // Trailing punctuation left dangling by the cut reads as a typo, not a trim.
  return { text: cut.replace(/[\s,;:.\-–—]+$/u, "").trim(), truncated: true };
}

/**
 * Optional string fields come back from the model as `string | null`, and an
 * "unknown" brand can also arrive as an empty string or whitespace. Both mean
 * the same thing to a consumer: the key should not be there.
 */
function optionalText(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

type NormalizedPrice = {
  low: number;
  suggested: number;
  high: number;
  reordered: boolean;
};

/**
 * Coerces the three price points into something monotonic and postable.
 *
 * Sorting rather than rejecting is the right call: if the model returns
 * low=120, suggested=90, high=60 it has understood the item and mislabelled the
 * fields, and the sorted band is still the band it meant. Non-finite or
 * non-positive values are a different failure - those get floored and flagged.
 */
export function normalizePrice(
  low: number,
  suggested: number,
  high: number,
): NormalizedPrice {
  const sanitize = (value: number): number =>
    Number.isFinite(value) && value > 0 ? Math.round(value) : MIN_PRICE;

  const raw = [low, suggested, high];
  const sorted = raw.map(sanitize).sort((a, b) => a - b);

  // Sound because `sorted` has exactly three entries, but the compiler cannot
  // know that under noUncheckedIndexedAccess.
  const [sortedLow = MIN_PRICE, sortedSuggested = MIN_PRICE, sortedHigh = MIN_PRICE] =
    sorted;

  const wasAscending = raw[0]! <= raw[1]! && raw[1]! <= raw[2]!;

  return {
    low: Math.max(sortedLow, MIN_PRICE),
    suggested: Math.max(sortedSuggested, MIN_PRICE),
    high: Math.max(sortedHigh, MIN_PRICE),
    reordered: !wasAscending,
  };
}

/** Last-resort title when the model returns nothing usable. Never expected; always survivable. */
function fallbackName(category: Category): string {
  return `Second-hand ${category.replace(/-/g, " ")}`;
}

export function normalizeDraft(draft: ModelDraft): Suggestion {
  const warnings: string[] = [];

  // The model's own caveats come first - they are about the item, which is what
  // the seller cares about. Ours are about our processing.
  for (const note of draft.notes) {
    const trimmed = note.trim();
    if (trimmed) warnings.push(trimmed);
  }

  if (!draft.itemIdentified) {
    warnings.push(
      "We could not clearly identify an item in this photo. Check every field before posting.",
    );
  }

  const clampedName = clampText(draft.name, FIELD_LIMITS.nameMaxLength);
  const clampedDescription = clampText(
    draft.description,
    FIELD_LIMITS.descriptionMaxLength,
  );

  if (clampedName.truncated) {
    warnings.push(
      `The suggested title was shortened to fit ${FIELD_LIMITS.nameMaxLength} characters.`,
    );
  }
  if (clampedDescription.truncated) {
    warnings.push(
      `The suggested description was shortened to fit ${FIELD_LIMITS.descriptionMaxLength} characters.`,
    );
  }

  let name = clampedName.text;
  if (!name) {
    name = fallbackName(draft.category);
    warnings.push("No title could be generated from this photo. Please write one.");
  }

  const price = normalizePrice(draft.priceLow, draft.priceSuggested, draft.priceHigh);
  if (price.reordered) {
    warnings.push("The suggested price range was reordered to make sense.");
  }
  if (draft.priceConfidence === "low") {
    warnings.push(
      "The price estimate is low-confidence. Compare against similar listings before posting.",
    );
  }

  const brand = optionalText(draft.brand);
  const size = optionalText(draft.size);

  return {
    name,
    description: clampedDescription.text,
    category: draft.category,
    condition: draft.condition,
    ...(brand ? { brand } : {}),
    ...(size ? { size } : {}),
    price: {
      low: price.low,
      suggested: price.suggested,
      high: price.high,
      currency: CURRENCY,
      // Always a model estimate today. See the note on PRICE_BASES in the
      // contract for what has to be true before this can say otherwise.
      basis: "model_estimate",
      comparablesUsed: 0,
      confidence: draft.priceConfidence,
    },
    warnings,
  };
}
