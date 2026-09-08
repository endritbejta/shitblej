const express = require("express");
const request = require("supertest");
const db = require("./helpers/db");
const {
  MongoRateLimitStore,
  RateLimitCounter,
} = require("../src/middleware/rateLimitStore");
const { createRateLimiter } = require("../src/middleware/rateLimit");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

const newStore = (windowMs = 60_000) => {
  const store = new MongoRateLimitStore();
  store.init({ windowMs });
  return store;
};

describe("MongoRateLimitStore", () => {
  it("counts hits per key", async () => {
    const store = newStore();

    expect((await store.increment("a")).totalHits).toBe(1);
    expect((await store.increment("a")).totalHits).toBe(2);
    // A different client must not inherit the first one's count.
    expect((await store.increment("b")).totalHits).toBe(1);
  });

  it("reports the window's end so clients get a reset time", async () => {
    const store = newStore(60_000);
    const before = Date.now();

    const { resetTime } = await store.increment("a");

    expect(resetTime.getTime()).toBeGreaterThan(before);
    expect(resetTime.getTime()).toBeLessThanOrEqual(before + 61_000);
  });

  it("keeps one window across many hits rather than sliding it forward", async () => {
    const store = newStore(60_000);

    const first = await store.increment("a");
    const second = await store.increment("a");

    // If each hit reset the clock, a steady stream of requests would never
    // expire and the limit would become permanent.
    expect(second.resetTime.getTime()).toBe(first.resetTime.getTime());
  });

  it("starts a fresh window once the old one has passed", async () => {
    const store = newStore(60_000);
    await store.increment("a");
    await store.increment("a");

    // Move this key's window into the past, the way real elapsed time would.
    await RateLimitCounter.updateOne(
      { _id: "a" },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const afterExpiry = await store.increment("a");
    expect(afterExpiry.totalHits).toBe(1);
    expect(afterExpiry.resetTime.getTime()).toBeGreaterThan(Date.now());
  });

  it("survives concurrent hits without losing counts", async () => {
    const store = newStore();

    // The whole reason increment is a single atomic document update: two
    // requests arriving together must not both "start" the window.
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.increment("a"))
    );

    expect(Math.max(...results.map((r) => r.totalHits))).toBe(20);
    expect((await RateLimitCounter.findById("a")).hits).toBe(20);
  });

  it("decrements without going negative", async () => {
    const store = newStore();
    await store.increment("a");
    await store.decrement("a");
    await store.decrement("a");

    expect((await RateLimitCounter.findById("a")).hits).toBe(0);
  });

  it("resets one key and all keys", async () => {
    const store = newStore();
    await store.increment("a");
    await store.increment("b");

    await store.resetKey("a");
    expect(await RateLimitCounter.findById("a")).toBeNull();
    expect(await RateLimitCounter.findById("b")).not.toBeNull();

    await store.resetAll();
    expect(await RateLimitCounter.countDocuments({})).toBe(0);
  });

  it("declares its keys shared, not per-process", async () => {
    // express-rate-limit reads this; getting it wrong reintroduces exactly the
    // per-process behaviour this store exists to remove.
    expect(new MongoRateLimitStore().localKeys).toBe(false);
  });

  it("allows the request when the database is unreachable", async () => {
    const store = newStore();
    const spy = jest
      .spyOn(RateLimitCounter, "findOneAndUpdate")
      .mockImplementation(() => {
        throw new Error("connection lost");
      });
    const quiet = jest.spyOn(console, "error").mockImplementation(() => {});

    // Failing closed would turn a database blip into a hard outage while
    // protecting nothing - these routes cannot serve a request without the
    // database anyway.
    await expect(store.increment("a")).resolves.toMatchObject({ totalHits: 1 });

    spy.mockRestore();
    quiet.mockRestore();
  });

  it("expires counters via a TTL index so the collection cannot grow forever", async () => {
    await RateLimitCounter.syncIndexes();
    const indexes = await RateLimitCounter.collection.indexes();
    const ttl = indexes.find((i) => i.expireAfterSeconds !== undefined);

    expect(ttl).toBeTruthy();
    expect(ttl.key).toEqual({ expiresAt: 1 });
  });
});

describe("the limiter behind a shared store", () => {
  // The bug this whole file exists for: with the library's default in-memory
  // store, each process counts on its own, so the configured limit is silently
  // multiplied by however many processes are running. Two limiter instances
  // stand in for two processes here.
  const appWith = (limiter) => {
    const app = express();
    app.use(limiter);
    app.get("/", (req, res) => res.json({ ok: true }));
    return app;
  };

  it("shares one budget across separate limiter instances", async () => {
    const processA = appWith(
      createRateLimiter({ windowMs: 60_000, max: 3, store: newStore() })
    );
    const processB = appWith(
      createRateLimiter({ windowMs: 60_000, max: 3, store: newStore() })
    );

    // Three requests spread across "both processes" spend the whole budget.
    expect((await request(processA).get("/")).status).toBe(200);
    expect((await request(processB).get("/")).status).toBe(200);
    expect((await request(processA).get("/")).status).toBe(200);

    // The fourth is refused no matter which one it reaches.
    expect((await request(processB).get("/")).status).toBe(429);
    expect((await request(processA).get("/")).status).toBe(429);
  });

  it("still answers 429 with the API error envelope", async () => {
    const app = appWith(
      createRateLimiter({ windowMs: 60_000, max: 1, store: newStore() })
    );

    await request(app).get("/");
    const blocked = await request(app).get("/");

    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, code: "rate_limited" });
  });
});
