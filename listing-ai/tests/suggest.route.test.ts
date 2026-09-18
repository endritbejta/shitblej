/**
 * Drives the real Fastify stack through `inject()` with a stubbed service, so
 * routing, validation, size limits and error mapping are all covered without an
 * API key or a listening port.
 */

import { describe, expect, it } from "vitest";

import { loadConfig, type Config } from "../src/config.js";
import { buildServer } from "../src/server.js";
import { base64ByteLength } from "../src/routes/suggest.js";
import { SUGGESTION_ERROR_CODES, SuggestionError } from "../src/errors.js";
import type { SuggestionService, SuggestResult } from "../src/analyze/service.js";
import type { Suggestion } from "../src/contracts/suggestion.js";

const SUGGESTION: Suggestion = {
  name: "Nike Air Max 90",
  description: "Black Nike Air Max 90, some creasing on the toe box.",
  category: "men",
  condition: "Used - Good",
  brand: "Nike",
  size: "42",
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

function config(overrides: Record<string, string> = {}): Config {
  return loadConfig({ LOG_LEVEL: "silent", ...overrides });
}

function stubService(
  result: SuggestResult | (() => Promise<SuggestResult>),
): SuggestionService {
  return {
    model: "claude-opus-5",
    suggest: typeof result === "function" ? result : async () => result,
  };
}

/** A 1x1 pixel's worth of bytes - enough to be a valid request body. */
const TINY_IMAGE = Buffer.from("fake image bytes").toString("base64");

function body(overrides: Record<string, unknown> = {}) {
  return {
    image: { kind: "base64", mediaType: "image/jpeg", data: TINY_IMAGE },
    ...overrides,
  };
}

describe("base64ByteLength", () => {
  it.each([
    ["QQ==", 1],
    ["QUI=", 2],
    ["QUJD", 3],
    ["QUJDRA==", 4],
  ])("decodes %s to %i bytes", (data, expected) => {
    expect(base64ByteLength(data)).toBe(expected);
    // Cross-check against the real decoder so the arithmetic cannot drift.
    expect(base64ByteLength(data)).toBe(Buffer.from(data, "base64").length);
  });
});

describe("GET /health", () => {
  it("reports ok when the service is configured", async () => {
    const app = buildServer({ config: config(), service: stubService({ suggestion: SUGGESTION, cached: false }) });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", model: "claude-opus-5" });
  });

  it("reports degraded, and why, when no key is configured", async () => {
    const app = buildServer({ config: config(), service: undefined });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "degraded",
      detail: "ANTHROPIC_API_KEY is not configured",
    });
  });
});

describe("POST /suggest", () => {
  it("returns a suggestion with metadata", async () => {
    const app = buildServer({
      config: config(),
      service: stubService({ suggestion: SUGGESTION, cached: false }),
    });

    const response = await app.inject({ method: "POST", url: "/suggest", payload: body() });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.suggestion).toEqual(SUGGESTION);
    expect(payload.meta).toMatchObject({ cached: false, model: "claude-opus-5" });
    expect(payload.meta.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports a cache hit so the caller knows it was free", async () => {
    const app = buildServer({
      config: config(),
      service: stubService({ suggestion: SUGGESTION, cached: true }),
    });

    const response = await app.inject({ method: "POST", url: "/suggest", payload: body() });

    expect(response.json().meta.cached).toBe(true);
  });

  it("passes the seller's hint through to the service", async () => {
    let received: string | undefined;
    const app = buildServer({
      config: config(),
      service: {
        model: "claude-opus-5",
        suggest: async ({ hint }) => {
          received = hint;
          return { suggestion: SUGGESTION, cached: false };
        },
      },
    });

    await app.inject({
      method: "POST",
      url: "/suggest",
      payload: body({ hint: "Nike Air Max, size 42" }),
    });

    expect(received).toBe("Nike Air Max, size 42");
  });

  it("rejects a body with no image", async () => {
    const app = buildServer({
      config: config(),
      service: stubService({ suggestion: SUGGESTION, cached: false }),
    });

    const response = await app.inject({ method: "POST", url: "/suggest", payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe(SUGGESTION_ERROR_CODES.INVALID_REQUEST);
  });

  it("rejects an unsupported media type", async () => {
    const app = buildServer({
      config: config(),
      service: stubService({ suggestion: SUGGESTION, cached: false }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/suggest",
      payload: body({ image: { kind: "base64", mediaType: "image/tiff", data: TINY_IMAGE } }),
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects an image over the configured size limit", async () => {
    const app = buildServer({
      config: config({ MAX_IMAGE_BYTES: "10" }),
      service: stubService({ suggestion: SUGGESTION, cached: false }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/suggest",
      payload: body({
        image: {
          kind: "base64",
          mediaType: "image/jpeg",
          data: Buffer.alloc(64).toString("base64"),
        },
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain("larger than");
  });

  it("accepts a URL image", async () => {
    const app = buildServer({
      config: config(),
      service: stubService({ suggestion: SUGGESTION, cached: false }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/suggest",
      payload: { image: { kind: "url", url: "https://example.com/shoe.jpg" } },
    });

    expect(response.statusCode).toBe(200);
  });

  it.each([
    [SUGGESTION_ERROR_CODES.RATE_LIMITED, 429, true],
    [SUGGESTION_ERROR_CODES.REFUSED, 422, false],
    [SUGGESTION_ERROR_CODES.UPSTREAM_INVALID, 502, true],
    [SUGGESTION_ERROR_CODES.UPSTREAM_ERROR, 502, true],
    [SUGGESTION_ERROR_CODES.NOT_CONFIGURED, 503, false],
  ])("maps %s to HTTP %i", async (code, status, retryable) => {
    const app = buildServer({
      config: config(),
      service: stubService(async () => {
        throw new SuggestionError(code, "upstream said no", { retryable });
      }),
    });

    const response = await app.inject({ method: "POST", url: "/suggest", payload: body() });

    expect(response.statusCode).toBe(status);
    expect(response.json().error).toMatchObject({ code, retryable });
  });

  it("returns 500 for a genuinely unexpected failure", async () => {
    const app = buildServer({
      config: config(),
      service: stubService(async () => {
        throw new TypeError("something we did not anticipate");
      }),
    });

    const response = await app.inject({ method: "POST", url: "/suggest", payload: body() });

    expect(response.statusCode).toBe(500);
  });

  it("answers 503 when the server has no service configured", async () => {
    const app = buildServer({ config: config(), service: undefined });

    const response = await app.inject({ method: "POST", url: "/suggest", payload: body() });

    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe(SUGGESTION_ERROR_CODES.NOT_CONFIGURED);
  });
});
