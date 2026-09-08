const request = require("supertest");
const express = require("express");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");
const { createRateLimiter } = require("../src/middleware/rateLimit");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("GET /api/v1/users/:id response scoping", () => {
  it("hides contact details from other users", async () => {
    const alice = await createUser();
    const bob = await createUser();

    const res = await request(app)
      .get(`/api/v1/users/${alice.user._id}`)
      .set("Authorization", `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    // Identity is public - this is a marketplace, sellers must be visible.
    expect(res.body.data.name).toBe(alice.user.name);
    // Contact details are not. The chat contact filter exists to keep
    // negotiation on-platform; this endpoint must not route around it.
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.phone).toBeUndefined();
    expect(res.body.data.role).toBeUndefined();
  });

  it("returns full details to the owner", async () => {
    const alice = await createUser();

    const res = await request(app)
      .get(`/api/v1/users/${alice.user._id}`)
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(alice.user.email);
  });

  it("never leaks the password hash to anyone", async () => {
    const alice = await createUser();
    const bob = await createUser();

    for (const caller of [alice, bob]) {
      const res = await request(app)
        .get(`/api/v1/users/${alice.user._id}`)
        .set("Authorization", `Bearer ${caller.token}`);
      expect(res.body.data.password).toBeUndefined();
    }
  });
});

describe("GET /api/v1/users/me", () => {
  // Exists so a client never has to decode the JWT to learn its own id, which
  // is what the web app was doing.
  it("returns the caller's own profile, contact details included", async () => {
    const alice = await createUser();

    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(String(alice.user._id));
    expect(res.body.data.email).toBe(alice.user.email);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });

  it("is not shadowed by the /:id route", async () => {
    const alice = await createUser();

    // Declared after "/:id" it would be captured as an id, fail the ObjectId
    // check and answer 400.
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.status).not.toBe(400);
  });
});

describe("GET /api/v1/products query hardening", () => {
  it("ignores Mongo operators smuggled in as query keys", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id, price: 10 });
    await createProduct({ userId: user._id, price: 500 });

    // Express's default query parser hands `$where` through as a literal
    // top-level key. It must never reach the database.
    const res = await request(app).get(
      `/api/v1/products?${encodeURIComponent("$where")}=this.price>100`
    );

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it("ignores unknown query params instead of filtering on them", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id });

    // `q` belongs to /products/search. On this route it used to become a
    // field filter and silently return zero results.
    const res = await request(app).get("/api/v1/products?q=anything");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it("still supports the documented filters", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id, category: "electronics", price: 10 });
    await createProduct({ userId: user._id, category: "sport", price: 500 });

    const byCategory = await request(app).get(
      "/api/v1/products?category=ELECTRONICS"
    );
    expect(byCategory.body.count).toBe(1);

    const byPrice = await request(app).get("/api/v1/products?price[lte]=100");
    expect(byPrice.body.count).toBe(1);

    const byRange = await request(app).get(
      "/api/v1/products?price[gte]=5&price[lte]=100"
    );
    expect(byRange.body.count).toBe(1);

    const bySeller = await request(app).get(
      `/api/v1/products?user=${user._id}`
    );
    expect(bySeller.body.count).toBe(2);
  });

  it("falls back to the default sort for a non-sortable field", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id });

    const res = await request(app).get("/api/v1/products?sort=notAField");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it("restricts select to known fields", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id });

    const res = await request(app).get("/api/v1/products?select=name,bogus");

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBeDefined();
    expect(res.body.data[0].bogus).toBeUndefined();
  });

  it("drops a malformed seller id rather than erroring", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id });

    const res = await request(app).get("/api/v1/products?user=not-an-id");

    // The filter is dropped, so this lists rather than throwing a CastError.
    expect(res.status).toBe(200);
  });
});

describe("security headers", () => {
  it("sets helmet's headers on API responses", async () => {
    const res = await request(app).get("/api/v1/products");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    // helmet removes the framework fingerprint.
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("rate limiting", () => {
  // The app-level limits are effectively disabled under NODE_ENV=test (the
  // suite drives hundreds of requests from one address), so the limiter
  // itself is exercised here on a throwaway app.
  it("answers 429 with the API error envelope once the limit is hit", async () => {
    const tiny = express();
    tiny.use(createRateLimiter({ windowMs: 60_000, max: 2 }));
    tiny.get("/", (req, res) => res.json({ success: true }));

    expect((await request(tiny).get("/")).status).toBe(200);
    expect((await request(tiny).get("/")).status).toBe(200);

    const blocked = await request(tiny).get("/");
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.code).toBe("rate_limited");
  });

  it("is wired onto login and register", async () => {
    // Proves the middleware is mounted (only the limiter sets this header),
    // without depending on the production threshold.
    const login = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "nobody@example.com", password: "whatever1" });
    expect(login.headers["ratelimit-policy"]).toBeDefined();

    const register = await request(app)
      .post("/api/v1/users/register")
      .send({ email: "fresh@example.com", password: "pass1234" });
    expect(register.headers["ratelimit-policy"]).toBeDefined();
  });
});

describe("database errors are not echoed to clients", () => {
  const errorHandler = require("../src/middleware/error");

  // Driven directly: with the query allowlist in place there is no longer a
  // route that can push a raw driver error out, which is the point - but the
  // handler still has to cope if one ever reaches it.
  const runHandler = (err) => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    errorHandler(err, { path: "/api/v1/products", method: "GET" }, res, () => {});
    return res;
  };

  it("maps a driver error to 400 without leaking its message", () => {
    const err = new Error("$where is not allowed in this context");
    err.name = "MongoServerError";
    err.code = 2;

    const res = runHandler(err);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid query.");
    expect(res.body.code).toBe("invalid_query");
    expect(JSON.stringify(res.body)).not.toMatch(/\$where/);
  });

  it("still reports the modelled cases with their own messages", () => {
    const duplicate = new Error("E11000 duplicate key error");
    duplicate.name = "MongoServerError";
    duplicate.code = 11000;
    duplicate.keyValue = { email: "taken@example.com" };

    const res = runHandler(duplicate);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe("login does not reveal which emails are registered", () => {
  it("answers identically for an unknown email and a wrong password", async () => {
    await createUser({ email: "known@example.com" });

    const unknown = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "unknown@example.com", password: "test1234" });
    const wrongPassword = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "known@example.com", password: "wrongpass1" });

    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknown.body.error).toBe(wrongPassword.body.error);
  });
});

describe("GET /api/v1/users (admin)", () => {
  it("returns an empty list rather than 404 when there are no users", async () => {
    const admin = await createUser();
    const User = require("../src/modules/users/user.model");
    await User.findByIdAndUpdate(admin.user._id, { role: "admin" });

    // Delete everyone else so only the admin remains, then confirm the
    // endpoint reports a list (an empty collection is not an error).
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("request body limit and error status propagation", () => {
  it("rejects a body over the 32kb limit as a client error, not a server fault", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a@b.c", password: "x".repeat(40_000) }));

    // This was a 500 until the error handler stopped losing statusCode.
    // `let error = { ...err }` copies only own enumerable properties, and
    // everything built on http-errors - body-parser here, serve-static
    // elsewhere - keeps statusCode on the prototype. So a client sending too
    // much data raised a server-error alert instead of being told off.
    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
  });

  it("reports malformed JSON as a 400", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .set("Content-Type", "application/json")
      .send('{"email": "a@b.c",');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("still defaults to 500 for an error that carries no status", async () => {
    // The fix must not turn an unexpected failure into a 200-ish response.
    const errorHandler = require("../src/middleware/error");
    const probe = express();
    probe.get("/boom", () => {
      throw new Error("something unforeseen");
    });
    probe.use(errorHandler);

    const res = await request(probe).get("/boom");
    expect(res.status).toBe(500);
  });
});
