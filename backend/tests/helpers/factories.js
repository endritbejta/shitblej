const request = require("supertest");
const app = require("../helpers/api").server;
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

const ADDRESS = {
  fullName: "Test Buyer",
  street: "Rr. Nena Tereze 1",
  city: "Fushe Kosove",
  postalCode: "12000",
  phone: "+38344123456",
};
exports.ADDRESS = ADDRESS;

// Drive the real negotiation flow through the API: buyer proposes, seller
// accepts. Returns the accepted offer.
exports.negotiateToAccepted = async ({
  buyer,
  seller,
  product,
  type = "buy_now",
  amountCents,
}) => {
  const offerRes = await request(app)
    .post("/api/v1/offers")
    .set("Authorization", `Bearer ${buyer.token}`)
    .send({ product: product._id.toString(), type, amountCents });
  if (!offerRes.body.data) {
    throw new Error("factory offer failed: " + JSON.stringify(offerRes.body));
  }
  const acceptRes = await request(app)
    .post(`/api/v1/offers/${offerRes.body.data._id}/accept`)
    .set("Authorization", `Bearer ${seller.token}`)
    .send({});
  if (!acceptRes.body.data) {
    throw new Error("factory accept failed: " + JSON.stringify(acceptRes.body));
  }
  return acceptRes.body.data;
};

// Full path to a live order: negotiate, then checkout.
exports.checkoutOrder = async ({ buyer, offer }) => {
  const res = await request(app)
    .post("/api/v1/orders")
    .set("Authorization", `Bearer ${buyer.token}`)
    .send({ offer: offer._id, shippingAddress: ADDRESS });
  if (!res.body.data) {
    throw new Error("factory checkout failed: " + JSON.stringify(res.body));
  }
  return res.body.data;
};
