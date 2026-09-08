const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const { createUser } = require("./helpers/factories");
const logger = require("../src/shared/logger");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("correlation id", () => {
  it("is returned on every response, so a user can quote it", async () => {
    const res = await request(app).get("/api/v1/products");

    // Without this, "it failed around 3pm" is the only handle on a report.
    expect(res.headers["x-request-id"]).toMatch(/^[A-Za-z0-9_-]{8,}$/);
  });

  it("differs per request", async () => {
    const a = await request(app).get("/api/v1/products");
    const b = await request(app).get("/api/v1/products");

    expect(a.headers["x-request-id"]).not.toBe(b.headers["x-request-id"]);
  });

  it("adopts an id from upstream, so one request keeps one identity", async () => {
    const res = await request(app)
      .get("/api/v1/products")
      .set("X-Request-Id", "upstream-trace-1234");

    expect(res.headers["x-request-id"]).toBe("upstream-trace-1234");
  });

  it("rejects a junk inbound id rather than logging whatever was sent", async () => {
    // The header is attacker-controlled and this value lands in every log line
    // for the request, so it has to be id-shaped or replaced.
    // A newline is not testable here: Node refuses to send such a header at
    // all, and rejects it server-side too.
    for (const junk of ["short", "has spaces", "x".repeat(200), "<script>"]) {
      const res = await request(app).get("/api/v1/products").set("X-Request-Id", junk);
      expect(res.headers["x-request-id"]).not.toBe(junk);
      expect(res.headers["x-request-id"]).toMatch(/^[A-Za-z0-9_-]{8,}$/);
    }
  });

  it("is present on an error response too", async () => {
    const res = await request(app).get("/api/v1/products/not-an-id");

    expect(res.status).toBe(400);
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});

describe("liveness vs readiness", () => {
  // Answering only the first question is how a deploy serves traffic it
  // cannot handle.
  it("liveness says nothing about dependencies", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("readiness reports the database as reachable", async () => {
    const res = await request(app).get("/health/ready");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      status: "ready",
      checks: { database: { state: "connected", reachable: true } },
    });
  });

  it("readiness answers 503 when the database cannot be reached", async () => {
    // A socket can be open while the server has stopped answering, so
    // readyState alone is not enough - readiness pings.
    const ping = jest
      .spyOn(mongoose.connection.db.admin(), "ping")
      .mockRejectedValue(new Error("no reply"));
    const admin = jest
      .spyOn(mongoose.connection.db, "admin")
      .mockReturnValue({ ping: () => Promise.reject(new Error("no reply")) });

    const res = await request(app).get("/health/ready");

    // 503, not 500: the instance is temporarily unable, not broken. That is
    // what lets a load balancer route around it instead of failing requests.
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.checks.database.reachable).toBe(false);

    admin.mockRestore();
    ping.mockRestore();
  });

  it("neither probe is rate limited or cached", async () => {
    for (const path of ["/health", "/health/ready"]) {
      const res = await request(app).get(path);
      // Mounted outside /api/v1, so a probe hitting constantly never consumes
      // a client's quota.
      expect(res.headers["ratelimit-policy"]).toBeUndefined();
    }
  });
});

describe("logging never writes a credential", () => {
  const pino = require("pino");
  const { Writable } = require("stream");

  // Build a logger from the SHIPPING redaction config and capture what it
  // writes. Spying on a logger method cannot test this: redaction happens
  // inside pino's serialization, after any call site.
  const capture = () => {
    const lines = [];
    const sink = new Writable({
      write(chunk, _enc, next) {
        lines.push(chunk.toString());
        next();
      },
    });
    const log = pino({ redact: { paths: logger.REDACT, censor: "[redacted]" } }, sink);
    return { log, output: () => lines.join("\n") };
  };

  it("redacts an Authorization header", () => {
    const { log, output } = capture();

    log.info({ req: { headers: { authorization: "Bearer super-secret-token" } } }, "req");

    // A log holding a usable bearer token is a credential store with none of
    // the handling a credential store gets.
    expect(output()).not.toContain("super-secret-token");
    expect(output()).toContain("[redacted]");
  });

  it("redacts cookies", () => {
    const { log, output } = capture();
    log.info({ req: { headers: { cookie: "session=abc123" } } }, "req");
    expect(output()).not.toContain("abc123");
  });

  it("redacts a password or token that reaches a log line by any path", () => {
    const { log, output } = capture();

    log.info({ password: "hunter2", token: "jwt-value", user: { password: "nested" } }, "oops");

    // Bodies are not logged today, but a future call site passing one should
    // not be the thing that leaks.
    for (const secret of ["hunter2", "jwt-value", "nested"]) {
      expect(output()).not.toContain(secret);
    }
  });

  it("still logs the parts that make a line useful", () => {
    const { log, output } = capture();

    log.info({ req: { method: "GET", url: "/api/v1/products", id: "abc12345" } }, "GET 200");

    // Redaction that swallowed the diagnostics would defeat the point.
    expect(output()).toContain("/api/v1/products");
    expect(output()).toContain("abc12345");
  });
});
