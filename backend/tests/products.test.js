const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");
const SavedItem = require("../src/modules/savedItems/savedItem.model");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("GET /api/v1/products", () => {
  it("lists products with the standard envelope", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id });
    await createProduct({ userId: user._id });

    const res = await request(app).get("/api/v1/products");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("paginates and exposes next/prev links", async () => {
    const { user } = await createUser();
    for (let i = 0; i < 3; i++) await createProduct({ userId: user._id });

    const res = await request(app).get("/api/v1/products?limit=2&page=1");

    expect(res.body.count).toBe(2);
    expect(res.body.pagination.next).toEqual({ page: 2, limit: 2 });
    expect(res.body.pagination.prev).toBeUndefined();
  });

  it("filters by category (case-insensitive)", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id, category: "electronics" });
    await createProduct({ userId: user._id, category: "sport" });

    const res = await request(app).get("/api/v1/products?category=ELECTRONICS");

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].category).toBe("electronics");
  });

  it("filters by price operators (price[lte])", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id, price: 10 });
    await createProduct({ userId: user._id, price: 500 });

    const res = await request(app).get("/api/v1/products?price[lte]=100");

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].price).toBe(10);
  });
});

describe("GET /api/v1/products/:id", () => {
  it("returns 404 for a missing product", async () => {
    const res = await request(app).get(
      "/api/v1/products/000000000000000000000000"
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app).get("/api/v1/products/not-an-id");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/products/search", () => {
  it("searches across name/description/category", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id, name: "Vintage Camera" });
    await createProduct({ userId: user._id, name: "Mountain Bike" });

    const res = await request(app).get("/api/v1/products/search?q=camera");

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].name).toBe("Vintage Camera");
  });

  it("returns empty for a blank query", async () => {
    const res = await request(app).get("/api/v1/products/search?q=");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

describe("POST /api/v1/products", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/v1/products").send({});
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/v1/products/:id (ownership)", () => {
  it("lets the owner update", async () => {
    const { token, user } = await createUser();
    const product = await createProduct({ userId: user._id });

    const res = await request(app)
      .put(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 99 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(99);
  });

  it("blocks a non-owner", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const product = await createProduct({ userId: owner.user._id });

    const res = await request(app)
      .put(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${intruder.token}`)
      .send({ price: 1 });

    // 403, not 401: the intruder IS authenticated, they just lack permission.
    // Every other module already answered 403 for this; products did not.
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/v1/products/:id", () => {
  it("deletes and cascades saved items", async () => {
    const { token, user } = await createUser();
    const product = await createProduct({ userId: user._id });
    await SavedItem.create({ user: user._id, product: product._id });

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await SavedItem.countDocuments({ product: product._id })).toBe(0);
  });
});
