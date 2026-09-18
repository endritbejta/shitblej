import { describe, expect, it } from "vitest";

import { cacheKey, SuggestionCache } from "../src/analyze/cache.js";
import type { ImageInput, Suggestion } from "../src/contracts/suggestion.js";

const image: ImageInput = { kind: "base64", mediaType: "image/jpeg", data: "AAAA" };

function suggestion(name: string): Suggestion {
  return {
    name,
    description: "",
    category: "men",
    condition: "Used - Good",
    price: {
      low: 10,
      suggested: 20,
      high: 30,
      currency: "EUR",
      basis: "model_estimate",
      comparablesUsed: 0,
      confidence: "medium",
    },
    warnings: [],
  };
}

/** A clock the test drives, so TTL behaviour is exercised without sleeping. */
function fakeClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("cacheKey", () => {
  const base = { model: "claude-opus-5", effort: "medium", image, hint: undefined };

  it("is stable for identical inputs", () => {
    expect(cacheKey(base)).toBe(cacheKey({ ...base }));
  });

  it("changes when the image changes", () => {
    const other: ImageInput = { kind: "base64", mediaType: "image/jpeg", data: "BBBB" };

    expect(cacheKey({ ...base, image: other })).not.toBe(cacheKey(base));
  });

  it("changes when the hint changes", () => {
    expect(cacheKey({ ...base, hint: "Nike 42" })).not.toBe(cacheKey(base));
  });

  it("changes when the model changes", () => {
    // Otherwise a model swap would keep serving answers from the old one, and
    // the change would look like it had no effect.
    expect(cacheKey({ ...base, model: "claude-sonnet-5" })).not.toBe(cacheKey(base));
  });

  it("changes when effort changes", () => {
    expect(cacheKey({ ...base, effort: "high" })).not.toBe(cacheKey(base));
  });

  it("does not confuse a URL image with base64 data of the same string", () => {
    const url: ImageInput = { kind: "url", url: "https://example.com/a.jpg" };
    const sameStringAsData: ImageInput = {
      kind: "base64",
      mediaType: "image/jpeg",
      data: "https://example.com/a.jpg",
    };

    expect(cacheKey({ ...base, image: url })).not.toBe(
      cacheKey({ ...base, image: sameStringAsData }),
    );
  });
});

describe("SuggestionCache", () => {
  it("returns a stored value", () => {
    const cache = new SuggestionCache({ maxEntries: 10, ttlMs: 1000 });
    cache.set("a", suggestion("Jacket"));

    expect(cache.get("a")?.name).toBe("Jacket");
  });

  it("returns undefined for an unknown key", () => {
    const cache = new SuggestionCache({ maxEntries: 10, ttlMs: 1000 });

    expect(cache.get("missing")).toBeUndefined();
  });

  it("expires an entry once its TTL has passed", () => {
    const clock = fakeClock();
    const cache = new SuggestionCache({ maxEntries: 10, ttlMs: 1000, now: clock.now });
    cache.set("a", suggestion("Jacket"));

    clock.advance(999);
    expect(cache.get("a")).toBeDefined();

    clock.advance(2);
    expect(cache.get("a")).toBeUndefined();
  });

  it("drops an expired entry rather than holding the memory", () => {
    const clock = fakeClock();
    const cache = new SuggestionCache({ maxEntries: 10, ttlMs: 100, now: clock.now });
    cache.set("a", suggestion("Jacket"));

    clock.advance(200);
    cache.get("a");

    expect(cache.size).toBe(0);
  });

  it("evicts the least recently used entry at capacity", () => {
    const cache = new SuggestionCache({ maxEntries: 2, ttlMs: 10_000 });
    cache.set("a", suggestion("A"));
    cache.set("b", suggestion("B"));

    // Touching "a" makes "b" the least recently used.
    cache.get("a");
    cache.set("c", suggestion("C"));

    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBeDefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBeDefined();
  });

  it("treats an overwrite as a use", () => {
    const cache = new SuggestionCache({ maxEntries: 2, ttlMs: 10_000 });
    cache.set("a", suggestion("A"));
    cache.set("b", suggestion("B"));

    cache.set("a", suggestion("A2"));
    cache.set("c", suggestion("C"));

    expect(cache.get("a")?.name).toBe("A2");
    expect(cache.get("b")).toBeUndefined();
  });

  it("never exceeds its capacity", () => {
    const cache = new SuggestionCache({ maxEntries: 3, ttlMs: 10_000 });
    for (let i = 0; i < 50; i += 1) cache.set(`k${i}`, suggestion(`S${i}`));

    expect(cache.size).toBe(3);
  });
});
