/**
 * Composes the cache and the analyzer.
 *
 * Kept separate from both so the route has one dependency and one method to
 * call, and so "did this cost money?" is answered in one place rather than
 * inferred at the edge.
 */

import type { Config } from "../config.js";
import type { ImageInput, Suggestion } from "../contracts/suggestion.js";
import { cacheKey, SuggestionCache } from "./cache.js";
import type { ListingAnalyzer } from "./analyzer.js";

export type SuggestInput = {
  image: ImageInput;
  hint?: string | undefined;
};

export type SuggestResult = {
  suggestion: Suggestion;
  /** False means this request hit the model API and was billed. */
  cached: boolean;
};

export interface SuggestionService {
  suggest(input: SuggestInput): Promise<SuggestResult>;
  readonly model: string;
}

export function createSuggestionService(
  analyzer: ListingAnalyzer,
  config: Config,
  cache = new SuggestionCache({
    maxEntries: config.CACHE_MAX_ENTRIES,
    ttlMs: config.CACHE_TTL_MS,
  }),
): SuggestionService {
  return {
    model: analyzer.model,

    async suggest({ image, hint }) {
      const key = cacheKey({
        model: analyzer.model,
        effort: config.ANTHROPIC_EFFORT,
        image,
        hint,
      });

      const hit = cache.get(key);
      if (hit) {
        return { suggestion: hit, cached: true };
      }

      const suggestion = await analyzer.analyze({ image, hint });

      // Only successful suggestions are cached. Caching a failure would turn a
      // transient rate limit into an hour of the feature looking broken.
      cache.set(key, suggestion);

      return { suggestion, cached: false };
    },
  };
}
