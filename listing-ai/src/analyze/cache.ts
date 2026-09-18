/**
 * A content-addressed cache in front of the model call.
 *
 * The behaviour it exists for: a seller taps "Suggest details", does not like
 * the title, and taps it again. Without this, that is two paid vision calls for
 * an identical request. Keying on the image bytes rather than a listing id also
 * means the retry after a failed form submit is free.
 *
 * In-process on purpose. A shared cache across replicas would be Redis, another
 * dependency, and another thing to run locally - for a saving measured in cents
 * on a service that currently runs as one instance. The interface is narrow
 * enough that swapping the implementation later touches this file only.
 */

import { createHash } from "node:crypto";
import type { ImageInput, Suggestion } from "../contracts/suggestion.js";

/**
 * Everything that can change the answer goes into the key. Model and effort are
 * in here because a cached suggestion from a different model is a different
 * product, and serving it after a config change would make that change look
 * like it had no effect.
 */
export type CacheKeyParts = {
  model: string;
  effort: string;
  image: ImageInput;
  hint: string | undefined;
};

export function cacheKey({ model, effort, image, hint }: CacheKeyParts): string {
  const hash = createHash("sha256");
  hash.update(model);
  hash.update("\0");
  hash.update(effort);
  hash.update("\0");
  // The discriminant and media type are hashed alongside the payload, not just
  // the payload: without them a URL and base64 data that happen to be the same
  // string collide, and the second caller gets the first one's suggestion.
  hash.update(image.kind);
  hash.update("\0");
  if (image.kind === "base64") {
    hash.update(image.mediaType);
    hash.update("\0");
    hash.update(image.data);
  } else {
    hash.update(image.url);
  }
  hash.update("\0");
  hash.update(hint ?? "");
  return hash.digest("hex");
}

type Entry = {
  value: Suggestion;
  expiresAt: number;
};

export type SuggestionCacheOptions = {
  maxEntries: number;
  ttlMs: number;
  /** Injectable so tests can advance time without sleeping. */
  now?: () => number;
};

/**
 * LRU with a TTL, built on Map's insertion ordering: re-inserting on read moves
 * an entry to the newest position, so the oldest key is always the first one
 * `keys()` yields. Small enough to read in one sitting, which is the point.
 */
export class SuggestionCache {
  readonly #entries = new Map<string, Entry>();
  readonly #maxEntries: number;
  readonly #ttlMs: number;
  readonly #now: () => number;

  constructor({ maxEntries, ttlMs, now = Date.now }: SuggestionCacheOptions) {
    this.#maxEntries = maxEntries;
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  get(key: string): Suggestion | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }

    // Re-insert to mark as most recently used.
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: Suggestion): void {
    // Delete first so an overwrite also counts as a use.
    this.#entries.delete(key);
    this.#entries.set(key, { value, expiresAt: this.#now() + this.#ttlMs });

    while (this.#entries.size > this.#maxEntries) {
      const oldest = this.#entries.keys().next();
      if (oldest.done) break;
      this.#entries.delete(oldest.value);
    }
  }

  get size(): number {
    return this.#entries.size;
  }

  clear(): void {
    this.#entries.clear();
  }
}
