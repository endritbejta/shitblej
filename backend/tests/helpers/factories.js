const request = require("supertest");
const app = require("../../src/app");
const Product = require("../../src/modules/products/product.model");

let counter = 0;

// Register a user through the real API and return { token, user }.
exports.createUser = async (overrides = {}) => {
  counter += 1;
  const res = await request(app)
    .post("/api/v1/users/register")
    .send({
      name: `Test User ${counter}`,
      email: `user${counter}.${Date.now()}@example.com`,
      password: "test1234",
      ...overrides,
    });
  if (!res.body.token) {
    throw new Error("factory createUser failed: " + JSON.stringify(res.body));
  }
  return { token: res.body.token, user: res.body.data };
};

// Insert a product directly via the model (skips the Cloudinary upload path).
exports.createProduct = async ({ userId, ...overrides } = {}) => {
  counter += 1;
  return Product.create({
    name: `Test Product ${counter}`,
    price: 25,
    category: "electronics",
    condition: "New",
    images: ["https://example.com/test.jpg"],
    user: userId,
    ...overrides,
  });
};
