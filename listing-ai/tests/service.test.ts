import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { createSuggestionService } from "../src/analyze/service.js";
import { SuggestionCache } from "../src/analyze/cache.js";
import { SUGGESTION_ERROR_CODES, SuggestionError } from "../src/errors.js";
import type { ListingAnalyzer } from "../src/analyze/analyzer.js";
import type { ImageInput, Suggestion } from "../src/contracts/suggestion.js";

const SUGGESTION: Suggestion = {
  name: "Nike Air Max 90",
  description: "",
  category: "men",
  condition: "Used - Good",
  price: {
    low: 30,
    suggested: 45,
    high: 60,
    currency: "EUR",
    basis: "model_estimate",
    comparablesUsed: 0,
    confidence: "medium",
  },
  warnings: [],
};

const image: ImageInput = { kind: "base64", mediaType: "image/jpeg", data: "AAAA" };

/** Counts calls so the tests can assert what actually reached the model. */
function countingAnalyzer(
  behaviour: () => Promise<Suggestion> = async () => SUGGESTION,
): ListingAnalyzer & { calls: number } {
  return {
    model: "claude-opus-5",
    calls: 0,
    async analyze() {
      this.calls += 1;
      return behaviour();
    },
  };
}

const config = loadConfig({ LOG_LEVEL: "silent" });

function serviceWith(analyzer: ListingAnalyzer) {
  return createSuggestionService(
    analyzer,
    config,
    new SuggestionCache({ maxEntries: 10, ttlMs: 60_000 }),
  );
}

describe("createSuggestionService", () => {
  it("calls the analyzer on a miss and reports it as uncached", async () => {
    const analyzer = countingAnalyzer();
    const result = await serviceWith(analyzer).suggest({ image });

    expect(result).toEqual({ suggestion: SUGGESTION, cached: false });
    expect(analyzer.calls).toBe(1);
  });

  it("serves a repeat request from the cache without calling the model", async () => {
    // The behaviour this cache exists for: a seller tapping "suggest" twice
    // must not be billed twice.
    const analyzer = countingAnalyzer();
    const service = serviceWith(analyzer);

    await service.suggest({ image });
    const second = await service.suggest({ image });

    expect(second.cached).toBe(true);
    expect(analyzer.calls).toBe(1);
  });

  it("treats a different hint as a different request", async () => {
    const analyzer = countingAnalyzer();
    const service = serviceWith(analyzer);

    await service.suggest({ image });
    await service.suggest({ image, hint: "Nike 42" });

    expect(analyzer.calls).toBe(2);
  });

  it("does not cache failures", async () => {
    // Caching a transient rate limit would turn one bad minute into an hour of
    // the feature looking broken.
    let attempt = 0;
    const analyzer = countingAnalyzer(async () => {
      attempt += 1;
      if (attempt === 1) {
        throw new SuggestionError(SUGGESTION_ERROR_CODES.RATE_LIMITED, "slow down", {
          retryable: true,
        });
      }
      return SUGGESTION;
    });
    const service = serviceWith(analyzer);

    await expect(service.suggest({ image })).rejects.toBeInstanceOf(SuggestionError);

    const retry = await service.suggest({ image });
    expect(retry.suggestion).toEqual(SUGGESTION);
    expect(retry.cached).toBe(false);
  });

  it("exposes the analyzer's model for response metadata", () => {
    expect(serviceWith(countingAnalyzer()).model).toBe("claude-opus-5");
  });
});
