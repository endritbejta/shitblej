// POST /api/v1/products/suggest
//
// The endpoint forwards to the listing-ai service, so `fetch` is stubbed here
// rather than standing a second service up. What that leaves under test is
// everything this repository actually owns: auth, the rate limiter's presence,
// request validation, the error translation in listingSuggestion.service.js,
// and the guarantee that a suggestion writes nothing.
//
// LISTING_AI_URL is set in tests/setup.js, not here: the config module reads
// the environment once at boot and the shared server is already required by
// setupFilesAfterEnv before this file's body runs.

const request = require("supertest");
const fs = require("fs");
const path = require("path");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const { createUser } = require("./helpers/factories");
const Product = require("../src/modules/products/product.model");
const {
  MAX_SUGGESTION_IMAGE_BYTES,
  SUGGESTION_IMAGE_TYPES,
} = require("../src/modules/products/product.validation");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

const SUGGESTION = {
  name: "Nike Air Max 90",
  description: "Black Nike Air Max 90 in good condition.",
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

const IMAGE = {
  kind: "base64",
  mediaType: "image/jpeg",
  data: Buffer.from("pretend jpeg bytes").toString("base64"),
};

/** Stubs the upstream with a given status and JSON body. */
const stubUpstream = (status, body) => {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
};

/** Stubs the upstream as unreachable, the way fetch actually reports it. */
const stubUnreachable = (error) => {
  global.fetch = jest.fn(async () => {
    throw error;
  });
};

const post = (token, body) => {
  const req = request(app).post("/api/v1/products/suggest");
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body);
};

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

describe("POST /api/v1/products/suggest", () => {
  it("requires authentication", async () => {
    stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

    const res = await post(null, { image: IMAGE });

    expect(res.status).toBe(401);
    // A paid endpoint must not be reachable anonymously, so the upstream should
    // never have been called.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns the suggestion in the standard envelope", async () => {
    const { token } = await createUser();
    stubUpstream(200, {
      suggestion: SUGGESTION,
      meta: { cached: false, model: "claude-opus-5", latencyMs: 1200 },
    });

    const res = await post(token, { image: IMAGE });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(SUGGESTION);
    expect(res.body.meta).toMatchObject({ cached: false, model: "claude-opus-5" });
  });

  it("writes nothing - a suggestion is a draft, not a listing", async () => {
    const { token } = await createUser();
    stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

    await post(token, { image: IMAGE });

    expect(await Product.countDocuments()).toBe(0);
  });

  it("forwards the seller's hint", async () => {
    const { token } = await createUser();
    stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

    await post(token, { image: IMAGE, hint: "Nike Air Max, size 42" });

    const [, init] = global.fetch.mock.calls[0];
    expect(JSON.parse(init.body).hint).toBe("Nike Air Max, size 42");
  });

  it("omits the hint entirely when none was given", async () => {
    const { token } = await createUser();
    stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

    await post(token, { image: IMAGE });

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).not.toHaveProperty("hint");
  });

  it("calls the configured service with a timeout signal", async () => {
    const { token } = await createUser();
    stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

    await post(token, { image: IMAGE });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("http://listing-ai.test/suggest");
    // Without a signal a hung upstream would hold an API worker open.
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  describe("validation", () => {
    it("rejects a body with no image", async () => {
      const { token } = await createUser();
      stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

      const res = await post(token, {});

      expect(res.status).toBe(400);
      // Rejected before it could become a paid call.
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects an unsupported media type", async () => {
      const { token } = await createUser();
      stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

      const res = await post(token, {
        image: { ...IMAGE, mediaType: "image/tiff" },
      });

      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects an image over the size cap", async () => {
      const { token } = await createUser();
      stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

      const oversized = "A".repeat(
        Math.ceil(((MAX_SUGGESTION_IMAGE_BYTES + 1024) * 4) / 3)
      );
      const res = await post(token, { image: { ...IMAGE, data: oversized } });

      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects a hint longer than the cap", async () => {
      const { token } = await createUser();
      stubUpstream(200, { suggestion: SUGGESTION, meta: {} });

      const res = await post(token, { image: IMAGE, hint: "x".repeat(201) });

      expect(res.status).toBe(400);
    });
  });

  describe("upstream failures", () => {
    it.each([
      ["rate_limited", 429],
      ["refused", 422],
      ["invalid_request", 400],
      ["not_configured", 503],
      ["upstream_error", 502],
      ["upstream_invalid", 502],
    ])("maps %s to %i", async (code, expected) => {
      const { token } = await createUser();
      stubUpstream(expected === 400 ? 400 : 500, {
        error: { code, message: "upstream detail", retryable: false },
      });

      const res = await post(token, { image: IMAGE });

      expect(res.status).toBe(expected);
      expect(res.body.success).toBe(false);
    });

    it("does not leak the upstream's own wording to the seller", async () => {
      const { token } = await createUser();
      stubUpstream(422, {
        error: { code: "refused", message: "The model declined to describe this image." },
      });

      const res = await post(token, { image: IMAGE });

      expect(res.body.error).not.toContain("model");
    });

    it("treats an unrecognised upstream code as a 502", async () => {
      // Means the two services have drifted; the seller still gets something
      // sensible rather than a 500.
      const { token } = await createUser();
      stubUpstream(500, { error: { code: "some_new_code", message: "?" } });

      const res = await post(token, { image: IMAGE });

      expect(res.status).toBe(502);
    });

    it("returns 503 when the service is unreachable", async () => {
      const { token } = await createUser();
      stubUnreachable(new TypeError("fetch failed"));

      const res = await post(token, { image: IMAGE });

      expect(res.status).toBe(503);
    });

    it("returns 503 when the service times out", async () => {
      const { token } = await createUser();
      const timeout = new Error("The operation was aborted due to timeout");
      timeout.name = "TimeoutError";
      stubUnreachable(timeout);

      const res = await post(token, { image: IMAGE });

      expect(res.status).toBe(503);
    });

    it("returns 502 when the upstream body has no suggestion", async () => {
      const { token } = await createUser();
      stubUpstream(200, { meta: {} });

      const res = await post(token, { image: IMAGE });

      expect(res.status).toBe(502);
    });
  });
});

// The two services validate images independently, so their limits have to
// agree or one of them rejects what the other accepts. This reads listing-ai's
// config the way tests/taxonomy.test.ts reads ours - as text, so it needs
// nothing installed over there.
describe("image limits match the listing-ai service", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../listing-ai/src/config.ts"),
    "utf8"
  );

  it("uses the same maximum image size", () => {
    const match = /MAX_IMAGE_BYTES:[\s\S]*?\.default\(\s*([\d\s*]+?)\s*\)/.exec(source);
    if (!match) throw new Error("Could not find MAX_IMAGE_BYTES default in listing-ai");

    // The default is written as an expression ("5 * 1024 * 1024"), so multiply
    // the factors out rather than reaching for eval.
    const bytes = match[1]
      .split("*")
      .reduce((product, factor) => product * Number(factor.trim()), 1);

    expect(bytes).toBe(MAX_SUGGESTION_IMAGE_BYTES);
  });

  it("accepts the same media types", () => {
    const block = /SUPPORTED_MEDIA_TYPES = \[([\s\S]*?)\]/.exec(
      fs.readFileSync(
        path.join(__dirname, "../../listing-ai/src/contracts/suggestion.ts"),
        "utf8"
      )
    );
    if (!block) throw new Error("Could not find SUPPORTED_MEDIA_TYPES in listing-ai");

    const upstream = [...block[1].matchAll(/"([^"]+)"/g)].map(([, value]) => value);
    expect(SUGGESTION_IMAGE_TYPES).toEqual(upstream);
  });
});
