const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("POST /api/v1/saved-items", () => {
  it("saves a product for the logged-in user", async () => {
    const { token, user } = await createUser();
    const product = await createProduct({ userId: user._id });

    const res = await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${token}`)
      .send({ product: product._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toBe(user._id);
  });

  it("rejects a duplicate save with 400", async () => {
    const { token, user } = await createUser();
    const product = await createProduct({ userId: user._id });
    const payload = { product: product._id.toString() };

    await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    const res = await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already/i);
  });

  it("404s when the product does not exist", async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${token}`)
      .send({ product: "000000000000000000000000" });

    expect(res.status).toBe(404);
  });

  it("binds ownership to the JWT even if the body claims another user", async () => {
    const { token, user } = await createUser();
    const other = await createUser();
    const product = await createProduct({ userId: user._id });

    const res = await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${token}`)
      .send({ product: product._id.toString(), user: other.user._id });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toBe(user._id);
  });
});

describe("GET /api/v1/saved-items", () => {
  it("lists only the caller's saved items", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const p1 = await createProduct({ userId: alice.user._id });
    const p2 = await createProduct({ userId: alice.user._id });

    await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ product: p1._id.toString() });
    await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ product: p2._id.toString() });

    const res = await request(app)
      .get("/api/v1/saved-items")
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.body.count).toBe(1);
  });
});

describe("DELETE /api/v1/saved-items/product/:productId", () => {
  it("unsaves by product id", async () => {
    const { token, user } = await createUser();
    const product = await createProduct({ userId: user._id });

    await request(app)
      .post("/api/v1/saved-items")
      .set("Authorization", `Bearer ${token}`)
      .send({ product: product._id.toString() });

    const del = await request(app)
      .delete(`/api/v1/saved-items/product/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(del.status).toBe(200);

    const list = await request(app)
      .get("/api/v1/saved-items")
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.count).toBe(0);
  });

  it("404s when nothing was saved", async () => {
    const { token } = await createUser();
    const res = await request(app)
      .delete("/api/v1/saved-items/product/000000000000000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
