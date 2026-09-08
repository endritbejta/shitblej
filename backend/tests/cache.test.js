const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

const cacheControl = (res) => res.headers["cache-control"];

describe("public product reads are cacheable", () => {
  it("allows short-lived caching of the listing", async () => {
    const res = await request(app).get("/api/v1/products");

    expect(res.status).toBe(200);
    expect(cacheControl(res)).toMatch(/public/);
    expect(cacheControl(res)).toMatch(/max-age=\d+/);
    // stale-while-revalidate is what makes repeat navigation feel instant.
    expect(cacheControl(res)).toMatch(/stale-while-revalidate=\d+/);
  });

  it("allows it on a single product and on search", async () => {
    const { user } = await createUser();
    const product = await createProduct({ userId: user._id });

    for (const url of [
      `/api/v1/products/${product._id}`,
      "/api/v1/products/search?q=test",
    ]) {
      const res = await request(app).get(url);
      expect(cacheControl(res)).toMatch(/public/);
    }
  });

  it("still sends an ETag, so revalidation costs no payload", async () => {
    const first = await request(app).get("/api/v1/products");
    expect(first.headers.etag).toBeDefined();

    // The point of pairing a short max-age with an ETag: once it lapses the
    // client asks, and an unchanged catalogue answers 304 with no body.
    const revalidated = await request(app)
      .get("/api/v1/products")
      .set("If-None-Match", first.headers.etag);

    expect(revalidated.status).toBe(304);
    expect(revalidated.text).toBeFalsy();
  });
});

describe("private endpoints are never stored", () => {
  // Default-deny: the app-level middleware marks everything no-store and only
  // product reads opt out, so a new private endpoint is covered without
  // anyone remembering to think about it.
  it("marks a chat thread no-store", async () => {
    const alice = await createUser();
    const bob = await createUser();

    const res = await request(app)
      .get(`/api/v1/messages/${bob.user._id}`)
      .set("Authorization", `Bearer ${alice.token}`);

    // These carry another person's words; nothing should hold them - not a
    // shared proxy, not the browser's disk cache on a shared machine.
    expect(cacheControl(res)).toBe("no-store");
  });

  it("marks conversations, orders, offers and saved items no-store", async () => {
    const alice = await createUser();
    const auth = { Authorization: `Bearer ${alice.token}` };

    const urls = [
      "/api/v1/messages/conversations",
      "/api/v1/orders/purchases",
      "/api/v1/orders/sales",
      "/api/v1/saved-items",
      "/api/v1/notifications",
    ];

    for (const url of urls) {
      const res = await request(app).get(url).set(auth);
      expect(cacheControl(res)).toBe("no-store");
    }
  });

  it("marks a user profile no-store", async () => {
    const alice = await createUser();

    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${alice.token}`);

    expect(cacheControl(res)).toBe("no-store");
  });

  it("marks a rate-limited response no-store too", async () => {
    const express = require("express");
    const { noStore } = require("../src/middleware/cache");
    const { createRateLimiter } = require("../src/middleware/rateLimit");

    // Mirrors app.js: the header middleware runs BEFORE the limiter, because
    // middleware that short-circuits never calls next(). With the limiter
    // first, a 429 was the one response under /api/v1 with no cache policy,
    // and a cached 429 would keep someone throttled past their window.
    const tiny = express();
    tiny.use("/api/v1", noStore, createRateLimiter({ windowMs: 60_000, max: 1 }));
    tiny.get("/api/v1/thing", (req, res) => res.json({ ok: true }));

    await request(tiny).get("/api/v1/thing");
    const blocked = await request(tiny).get("/api/v1/thing");

    expect(blocked.status).toBe(429);
    expect(cacheControl(blocked)).toBe("no-store");
  });

  it("marks an unauthorized response no-store too", async () => {
    // Error bodies are as private as success bodies, and a cached 401 would
    // be its own bug.
    const res = await request(app).get("/api/v1/messages/conversations");

    expect(res.status).toBe(401);
    expect(cacheControl(res)).toBe("no-store");
  });
});
