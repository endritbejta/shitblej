import { describe, expect, it } from "vitest";

import { clampText, normalizeDraft, normalizePrice } from "../src/analyze/normalize.js";
import { suggestionSchema, type ModelDraft } from "../src/contracts/suggestion.js";
import { FIELD_LIMITS } from "../src/domain/taxonomy.js";

/** A well-behaved draft. Each test overrides only the field it is about. */
function draft(overrides: Partial<ModelDraft> = {}): ModelDraft {
  return {
    itemIdentified: true,
    name: "Nike Air Max 90",
    description: "Black Nike Air Max 90 in good condition. Some creasing on the toe box.",
    category: "men",
    condition: "Used - Good",
    brand: "Nike",
    size: "42",
    priceLow: 30,
    priceSuggested: 45,
    priceHigh: 60,
    priceConfidence: "medium",
    notes: [],
    ...overrides,
  };
}

describe("clampText", () => {
  it("leaves text within the limit untouched", () => {
    expect(clampText("Nike Air Max 90", 50)).toEqual({
      text: "Nike Air Max 90",
      truncated: false,
    });
  });

  it("trims surrounding whitespace without counting it as truncation", () => {
    expect(clampText("  Nike Air Max 90  ", 50)).toEqual({
      text: "Nike Air Max 90",
      truncated: false,
    });
  });

  it("breaks at a word boundary rather than mid-word", () => {
    const result = clampText("Vintage Levis 501 denim jacket in excellent condition", 30);

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(30);
    // The cut must not leave a partial word.
    expect(result.text).toBe("Vintage Levis 501 denim jacket");
  });

  it("hard-cuts when a word boundary would discard most of the text", () => {
    // No space until well past the limit, so backing off would leave almost
    // nothing - the hard cut preserves more.
    const result = clampText("Supercalifragilisticexpialidocious item", 20);

    expect(result.truncated).toBe(true);
    expect(result.text).toBe("Supercalifragilistic");
  });

  it("does not leave dangling punctuation at the cut", () => {
    const result = clampText("Blue ceramic vase, hand painted, 30cm tall", 20);

    expect(result.truncated).toBe(true);
    expect(result.text).toBe("Blue ceramic vase");
  });
});

describe("normalizePrice", () => {
  it("keeps an already-ordered range and reports no reordering", () => {
    expect(normalizePrice(30, 45, 60)).toEqual({
      low: 30,
      suggested: 45,
      high: 60,
      reordered: false,
    });
  });

  it("sorts a range the model returned backwards", () => {
    expect(normalizePrice(120, 90, 60)).toEqual({
      low: 60,
      suggested: 90,
      high: 120,
      reordered: true,
    });
  });

  it("rounds to whole euros", () => {
    const price = normalizePrice(30.4, 45.6, 59.5);

    expect(price).toMatchObject({ low: 30, suggested: 46, high: 60 });
  });

  it("floors non-positive and non-finite values to the minimum", () => {
    const price = normalizePrice(0, -5, Number.NaN);

    expect(price.low).toBeGreaterThan(0);
    expect(price.suggested).toBeGreaterThan(0);
    expect(price.high).toBeGreaterThan(0);
  });

  it("tolerates all three points being equal", () => {
    expect(normalizePrice(50, 50, 50)).toMatchObject({
      low: 50,
      suggested: 50,
      high: 50,
      reordered: false,
    });
  });
});

describe("normalizeDraft", () => {
  it("produces a suggestion that satisfies the public contract", () => {
    const result = suggestionSchema.safeParse(normalizeDraft(draft()));

    expect(result.success).toBe(true);
  });

  it("passes through a clean draft without inventing warnings", () => {
    const suggestion = normalizeDraft(draft());

    expect(suggestion.warnings).toEqual([]);
    expect(suggestion.name).toBe("Nike Air Max 90");
    expect(suggestion.brand).toBe("Nike");
    expect(suggestion.size).toBe("42");
  });

  it("always reports a model estimate with no comparables", () => {
    // Guards the honesty property: until there are enough closed orders to
    // support comparables, no response may imply the price came from sales data.
    const suggestion = normalizeDraft(draft());

    expect(suggestion.price.basis).toBe("model_estimate");
    expect(suggestion.price.comparablesUsed).toBe(0);
    expect(suggestion.price.currency).toBe("EUR");
  });

  it("clamps an over-long title and says so", () => {
    const suggestion = normalizeDraft(
      draft({ name: "A".repeat(FIELD_LIMITS.nameMaxLength + 40) }),
    );

    expect(suggestion.name.length).toBeLessThanOrEqual(FIELD_LIMITS.nameMaxLength);
    expect(suggestion.warnings.some((w) => w.includes("title was shortened"))).toBe(true);
  });

  it("clamps an over-long description and says so", () => {
    const suggestion = normalizeDraft(
      draft({ description: "word ".repeat(FIELD_LIMITS.descriptionMaxLength) }),
    );

    expect(suggestion.description.length).toBeLessThanOrEqual(
      FIELD_LIMITS.descriptionMaxLength,
    );
    expect(suggestion.warnings.some((w) => w.includes("description was shortened"))).toBe(
      true,
    );
  });

  it("omits brand and size rather than emitting empty strings", () => {
    const suggestion = normalizeDraft(draft({ brand: null, size: "   " }));

    expect(suggestion).not.toHaveProperty("brand");
    expect(suggestion).not.toHaveProperty("size");
  });

  it("surfaces the model's own notes as warnings, in order and first", () => {
    const suggestion = normalizeDraft(
      draft({ notes: ["The photo is dark.", "A scuff is visible on the heel."] }),
    );

    expect(suggestion.warnings.slice(0, 2)).toEqual([
      "The photo is dark.",
      "A scuff is visible on the heel.",
    ]);
  });

  it("drops blank notes instead of emitting empty warnings", () => {
    const suggestion = normalizeDraft(draft({ notes: ["   ", ""] }));

    expect(suggestion.warnings).toEqual([]);
  });

  it("warns when the model could not identify an item", () => {
    const suggestion = normalizeDraft(draft({ itemIdentified: false }));

    expect(suggestion.warnings.some((w) => w.includes("could not clearly identify"))).toBe(
      true,
    );
  });

  it("warns on a low-confidence price", () => {
    const suggestion = normalizeDraft(draft({ priceConfidence: "low" }));

    expect(suggestion.warnings.some((w) => w.includes("low-confidence"))).toBe(true);
  });

  it("warns when the price range had to be reordered", () => {
    const suggestion = normalizeDraft(
      draft({ priceLow: 120, priceSuggested: 90, priceHigh: 60 }),
    );

    expect(suggestion.price).toMatchObject({ low: 60, suggested: 90, high: 120 });
    expect(suggestion.warnings.some((w) => w.includes("reordered"))).toBe(true);
  });

  it("falls back to a usable title when the model returns none", () => {
    const suggestion = normalizeDraft(draft({ name: "   ", category: "home" }));

    expect(suggestion.name).toBe("Second-hand home");
    expect(suggestion.warnings.some((w) => w.includes("No title"))).toBe(true);
    expect(suggestionSchema.safeParse(suggestion).success).toBe(true);
  });

  it("still returns a contract-valid suggestion from a maximally broken draft", () => {
    const suggestion = normalizeDraft(
      draft({
        itemIdentified: false,
        name: "",
        description: "",
        brand: "",
        size: null,
        priceLow: Number.NaN,
        priceSuggested: -10,
        priceHigh: 0,
        priceConfidence: "low",
      }),
    );

    expect(suggestionSchema.safeParse(suggestion).success).toBe(true);
  });
});
