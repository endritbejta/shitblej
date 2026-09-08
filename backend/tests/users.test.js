const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const { createUser } = require("./helpers/factories");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("POST /api/v1/users/register", () => {
  it("registers a user and returns a token + public profile", async () => {
    const res = await request(app).post("/api/v1/users/register").send({
      name: "Endrit",
      email: "endrit@example.com",
      password: "pass1234",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.email).toBe("endrit@example.com");
    // The password hash must never leak
    expect(res.body.data.password).toBeUndefined();
  });

  it("rejects a duplicate email", async () => {
    await createUser({ email: "dup@example.com" });
    const res = await request(app).post("/api/v1/users/register").send({
      email: "dup@example.com",
      password: "pass1234",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("allows two users without a phone (sparse unique index)", async () => {
    await createUser();
    const second = await request(app).post("/api/v1/users/register").send({
      email: `second.${Date.now()}@example.com`,
      password: "pass1234",
    });

    expect(second.status).toBe(201);
  });

  it("rejects an invalid body with a validation error", async () => {
    const res = await request(app).post("/api/v1/users/register").send({
      email: "notanemail",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation error/i);
  });

  it("strips a role field from the payload (no privilege escalation)", async () => {
    const res = await request(app).post("/api/v1/users/register").send({
      email: "sneaky@example.com",
      password: "pass1234",
      role: "admin",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("user");
  });
});

describe("POST /api/v1/users/login", () => {
  it("logs in with valid credentials", async () => {
    await createUser({ email: "login@example.com" });
    const res = await request(app).post("/api/v1/users/login").send({
      email: "login@example.com",
      password: "test1234",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects a wrong password with 401", async () => {
    await createUser({ email: "wrongpw@example.com" });
    const res = await request(app).post("/api/v1/users/login").send({
      email: "wrongpw@example.com",
      password: "incorrect1",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});

describe("GET /api/v1/users", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users");
    expect(res.status).toBe(401);
  });

  it("rejects a non-admin user with 403", async () => {
    const { token } = await createUser();
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe("PUT /api/v1/users/:id", () => {
  it("lets a user update their own profile", async () => {
    const { token, user } = await createUser();
    const res = await request(app)
      .put(`/api/v1/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Renamed");
  });

  it("blocks updating someone else's profile", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const res = await request(app)
      .put(`/api/v1/users/${alice.user._id}`)
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ name: "Hacked" });

    expect(res.status).toBe(403);
  });

  it("rejects password changes through this route", async () => {
    const { token, user } = await createUser();
    const res = await request(app)
      .put(`/api/v1/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "newpass99" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dedicated route/i);
  });
});
