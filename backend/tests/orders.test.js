const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");
const Product = require("../src/modules/products/product.model");
const domainEvents = require("../src/shared/events/domainEvents");
const { ORDER_EVENTS } = require("../src/modules/orders/order.constants");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

const ADDRESS = {
  fullName: "Test Buyer",
  street: "Rr. Nena Tereze 1",
  city: "Fushe Kosove",
  postalCode: "12000",
  phone: "+38344123456",
};

// Standard fixture: a seller with one available product and a buyer.
const setupParties = async (productOverrides = {}) => {
  const seller = await createUser();
  const buyer = await createUser();
  const product = await createProduct({
    userId: seller.user._id,
    price: 25.5,
    ...productOverrides,
  });
  return { seller, buyer, product };
};

const placeOrder = ({ buyer, items, overrides = {} }) =>
  request(app)
    .post("/api/v1/orders")
    .set("Authorization", `Bearer ${buyer.token}`)
    .send({ items, shippingAddress: ADDRESS, ...overrides });

const act = ({ actor, orderId, action, body = {} }) =>
  request(app)
    .post(`/api/v1/orders/${orderId}/${action}`)
    .set("Authorization", `Bearer ${actor.token}`)
    .send(body);

describe("POST /api/v1/orders (placement)", () => {
  it("places an order: snapshots items, prices in cents, reserves the product", async () => {
    const { buyer, product } = await setupParties();

    const placed = new Promise((resolve) =>
      domainEvents.once(ORDER_EVENTS.PLACED, resolve)
    );
    const res = await placeOrder({ buyer, items: [product._id.toString()] });

    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order.orderNumber).toMatch(/^ORD-/);
    expect(order.status).toBe("pending");
    expect(order.items).toHaveLength(1);
    expect(order.items[0].name).toBe(product.name);
    expect(order.items[0].unitPriceCents).toBe(2550);
    expect(order.subtotalCents).toBe(2550);
    expect(order.totalCents).toBe(2550);
    expect(order.currency).toBe("EUR");
    expect(order.statusHistory).toHaveLength(1);

    const reserved = await Product.findById(product._id);
    expect(reserved.status).toBe("reserved");

    const event = await placed;
    expect(event.orderId).toBe(order._id);
    expect(event.totalCents).toBe(2550);
  });

  it("rejects ordering your own product and releases the reservation", async () => {
    const { seller, product } = await setupParties();
    const res = await placeOrder({
      buyer: seller,
      items: [product._id.toString()],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own products/i);
    expect((await Product.findById(product._id)).status).toBe("available");
  });

  it("rejects an already-reserved product with 409", async () => {
    const { buyer, product } = await setupParties();
    const rival = await createUser();

    await placeOrder({ buyer, items: [product._id.toString()] });
    const res = await placeOrder({
      buyer: rival,
      items: [product._id.toString()],
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/unavailable/i);
    // The first buyer's reservation is untouched
    expect((await Product.findById(product._id)).status).toBe("reserved");
  });

  it("rejects mixed-seller carts and releases every reservation", async () => {
    const { buyer, product } = await setupParties();
    const otherSeller = await createUser();
    const otherProduct = await createProduct({ userId: otherSeller.user._id });

    const res = await placeOrder({
      buyer,
      items: [product._id.toString(), otherProduct._id.toString()],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/same seller/i);
    expect((await Product.findById(product._id)).status).toBe("available");
    expect((await Product.findById(otherProduct._id)).status).toBe("available");
  });

  it("replays an idempotent retry instead of creating a duplicate", async () => {
    const { buyer, product } = await setupParties();
    const overrides = { idempotencyKey: "checkout-abc-123" };

    const first = await placeOrder({
      buyer,
      items: [product._id.toString()],
      overrides,
    });
    const retry = await placeOrder({
      buyer,
      items: [product._id.toString()],
      overrides,
    });

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.data._id).toBe(first.body.data._id);
  });

  it("validates the payload (empty items, missing address)", async () => {
    const { buyer } = await setupParties();

    const empty = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ items: [], shippingAddress: ADDRESS });
    expect(empty.status).toBe(400);

    const noAddress = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ items: ["000000000000000000000000"] });
    expect(noAddress.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .send({ items: ["000000000000000000000000"], shippingAddress: ADDRESS });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/orders/:id (access control)", () => {
  it("is visible to buyer and seller, hidden from strangers", async () => {
    const { seller, buyer, product } = await setupParties();
    const stranger = await createUser();
    const { body } = await placeOrder({
      buyer,
      items: [product._id.toString()],
    });
    const url = `/api/v1/orders/${body.data._id}`;

    const asBuyer = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${buyer.token}`);
    const asSeller = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${seller.token}`);
    const asStranger = await request(app)
      .get(url)
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(asBuyer.status).toBe(200);
    expect(asSeller.status).toBe(200);
    expect(asStranger.status).toBe(403);
  });
});

describe("order lifecycle transitions", () => {
  const placedOrder = async () => {
    const parties = await setupParties();
    const res = await placeOrder({
      buyer: parties.buyer,
      items: [parties.product._id.toString()],
    });
    return { ...parties, orderId: res.body.data._id };
  };

  it("seller accepts a pending order", async () => {
    const { seller, orderId } = await placedOrder();
    const res = await act({ actor: seller, orderId, action: "accept" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("accepted");
    expect(res.body.data.statusHistory).toHaveLength(2);
  });

  it("buyer cannot accept (party-based authorization)", async () => {
    const { buyer, orderId } = await placedOrder();
    const res = await act({ actor: buyer, orderId, action: "accept" });
    expect(res.status).toBe(403);
  });

  it("cannot ship an order that is still pending (illegal transition)", async () => {
    const { seller, orderId } = await placedOrder();
    const res = await act({ actor: seller, orderId, action: "ship" });
    expect(res.status).toBe(409);
  });

  it("declining releases the product back to available", async () => {
    const { seller, orderId, product } = await placedOrder();
    const res = await act({
      actor: seller,
      orderId,
      action: "decline",
      body: { note: "Item damaged in storage" },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("declined");
    expect((await Product.findById(product._id)).status).toBe("available");
  });

  it("buyer can cancel while pending; product is released", async () => {
    const { buyer, orderId, product } = await placedOrder();
    const res = await act({ actor: buyer, orderId, action: "cancel" });

    expect(res.status).toBe(200);
    expect((await Product.findById(product._id)).status).toBe("available");
  });

  it("buyer cannot cancel after acceptance, seller can", async () => {
    const { seller, buyer, orderId } = await placedOrder();
    await act({ actor: seller, orderId, action: "accept" });

    const buyerCancel = await act({ actor: buyer, orderId, action: "cancel" });
    expect(buyerCancel.status).toBe(409);

    const sellerCancel = await act({ actor: seller, orderId, action: "cancel" });
    expect(sellerCancel.status).toBe(200);
  });

  it("full happy path: accept -> ship -> deliver settles cash and sells the item", async () => {
    const { seller, buyer, orderId, product } = await placedOrder();

    await act({ actor: seller, orderId, action: "accept" });
    const shipped = await act({
      actor: seller,
      orderId,
      action: "ship",
      body: { carrier: "Posta e Kosoves", trackingNumber: "PK123456" },
    });
    expect(shipped.status).toBe(200);
    expect(shipped.body.data.shipment.trackingNumber).toBe("PK123456");

    // Only the buyer confirms receipt
    const sellerDeliver = await act({ actor: seller, orderId, action: "deliver" });
    expect(sellerDeliver.status).toBe(403);

    const delivered = await act({ actor: buyer, orderId, action: "deliver" });
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.status).toBe("delivered");
    expect(delivered.body.data.paymentStatus).toBe("paid");
    expect(delivered.body.data.statusHistory).toHaveLength(4);
    expect((await Product.findById(product._id)).status).toBe("sold");
  });

  it("delivered is terminal: no further actions succeed", async () => {
    const { seller, buyer, orderId } = await placedOrder();
    await act({ actor: seller, orderId, action: "accept" });
    await act({ actor: seller, orderId, action: "ship" });
    await act({ actor: buyer, orderId, action: "deliver" });

    const res = await act({ actor: seller, orderId, action: "cancel" });
    expect(res.status).toBe(409);
  });
});

describe("GET /api/v1/orders/purchases and /sales", () => {
  it("splits views by role and supports status filtering", async () => {
    const { seller, buyer, product } = await setupParties();
    const res = await placeOrder({ buyer, items: [product._id.toString()] });
    await act({ actor: seller, orderId: res.body.data._id, action: "accept" });

    const purchases = await request(app)
      .get("/api/v1/orders/purchases")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(purchases.body.count).toBe(1);

    const sales = await request(app)
      .get("/api/v1/orders/sales")
      .set("Authorization", `Bearer ${seller.token}`);
    expect(sales.body.count).toBe(1);

    // The buyer sold nothing
    const buyerSales = await request(app)
      .get("/api/v1/orders/sales")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerSales.body.count).toBe(0);

    // Status filter
    const pendingOnly = await request(app)
      .get("/api/v1/orders/purchases?status=pending")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(pendingOnly.body.count).toBe(0);

    const acceptedOnly = await request(app)
      .get("/api/v1/orders/purchases?status=accepted")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(acceptedOnly.body.count).toBe(1);
  });
});

describe("product integration", () => {
  it("a reserved product cannot be deleted by its seller", async () => {
    const { seller, buyer, product } = await setupParties();
    await placeOrder({ buyer, items: [product._id.toString()] });

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active order/i);
  });
});
