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

describe("each limiter keeps its own counter", () => {
  // The bug this guards: both limiters wrote to one document keyed by bare
  // IP, and an auth request passes through the blanket /api/v1 limiter AND
  // the tighter auth limiter. So general browsing incremented the number the
  // auth limiter reads, and roughly ten requests of any kind from one address
  // locked that address out of logging in for the rest of the window.
  it("does not let one limiter's traffic count against another's", async () => {
    const api = new MongoRateLimitStore({ prefix: "api:" });
    const auth = new MongoRateLimitStore({ prefix: "auth:" });
    api.init({ windowMs: 60_000 });
    auth.init({ windowMs: 60_000 });

    for (let i = 0; i < 5; i += 1) await api.increment("1.2.3.4");

    // The auth limiter has seen nothing from this address.
    const first = await auth.increment("1.2.3.4");
    expect(first.totalHits).toBe(1);

    // ...and the api counter is untouched by the auth hit.
    const apiNext = await api.increment("1.2.3.4");
    expect(apiNext.totalHits).toBe(6);
  });

  it("exposes `prefix`, which is what express-rate-limit reads", async () => {
    // The library builds `${store.prefix ?? ""}${key}` to decide whether one
    // request counted a key twice (ERR_ERL_DOUBLE_COUNT). Without this field
    // both limiters looked like the same counter and it threw on every auth
    // request outside NODE_ENV=test.
    expect(new MongoRateLimitStore({ prefix: "auth:" }).prefix).toBe("auth:");
    expect(new MongoRateLimitStore().prefix).toBe("");
  });

  it("keeps separate keys per client within a limiter", async () => {
    const store = new MongoRateLimitStore({ prefix: "api:" });
    store.init({ windowMs: 60_000 });

    await store.increment("10.0.0.1");
    await store.increment("10.0.0.1");
    const other = await store.increment("10.0.0.2");

    expect(other.totalHits).toBe(1);
  });

  it("resetAll clears only its own namespace", async () => {
    const api = new MongoRateLimitStore({ prefix: "api:" });
    const auth = new MongoRateLimitStore({ prefix: "auth:" });
    api.init({ windowMs: 60_000 });
    auth.init({ windowMs: 60_000 });

    await api.increment("9.9.9.9");
    await auth.increment("9.9.9.9");

    await api.resetAll();

    expect((await api.increment("9.9.9.9")).totalHits).toBe(1);
    // Someone else's window is not ours to clear.
    expect((await auth.increment("9.9.9.9")).totalHits).toBe(2);
  });
});

describe("a route behind two limiters", () => {
  // /api/v1/users/register really is behind two: the blanket limiter mounted
  // on /api/v1, and the tighter auth limiter on the route itself.
  const appWithBoth = () => {
    const apiStore = new MongoRateLimitStore({ prefix: "api:" });
    const authStore = new MongoRateLimitStore({ prefix: "auth:" });
    const app = express();
    app.set("trust proxy", 0);
    app.use(
      "/api",
      createRateLimiter({ windowMs: 60_000, max: 100, store: apiStore }),
      createRateLimiter({ windowMs: 60_000, max: 3, store: authStore }),
      (req, res) => res.json({ ok: true })
    );
    return { app, apiStore, authStore };
  };

  it("counts each request once per limiter, not twice in one counter", async () => {
    const { app } = appWithBoth();

    expect((await request(app).get("/api/login")).status).toBe(200);

    const counters = await RateLimitCounter.find().lean();
    // Two documents, one per limiter, each at one hit. Before the prefix
    // there was a single document at two hits, and express-rate-limit
    // reported it as ERR_ERL_DOUBLE_COUNT on every auth request.
    expect(counters).toHaveLength(2);
    expect(counters.map((c) => c.hits)).toEqual([1, 1]);
    expect(counters.map((c) => c._id).sort()).toEqual(["api:127.0.0.1", "auth:127.0.0.1"]);
  });

  it("does not let general traffic exhaust the tighter limit", async () => {
    // The user-visible bug: browse ten pages, then be unable to log in.
    const apiStore = new MongoRateLimitStore({ prefix: "api:" });
    const authStore = new MongoRateLimitStore({ prefix: "auth:" });

    const browsing = express();
    browsing.set("trust proxy", 0);
    browsing.use(createRateLimiter({ windowMs: 60_000, max: 100, store: apiStore }));
    browsing.get("/", (req, res) => res.json({ ok: true }));

    const login = express();
    login.set("trust proxy", 0);
    login.use(createRateLimiter({ windowMs: 60_000, max: 100, store: apiStore }));
    login.use(createRateLimiter({ windowMs: 60_000, max: 3, store: authStore }));
    login.post("/", (req, res) => res.json({ ok: true }));

    for (let i = 0; i < 20; i += 1) {
      expect((await request(browsing).get("/")).status).toBe(200);
    }

    // Logging in is still possible after all that browsing.
    expect((await request(login).post("/")).status).toBe(200);
  });
});
