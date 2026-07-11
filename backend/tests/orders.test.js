const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const {
  createUser,
  createProduct,
  negotiateToAccepted,
  checkoutOrder,
  ADDRESS,
} = require("./helpers/factories");
const Product = require("../src/modules/products/product.model");
const Offer = require("../src/modules/offers/offer.model");
const Notification = require("../src/modules/notifications/notification.model");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

const setup = async (productOverrides = {}) => {
  const seller = await createUser();
  const buyer = await createUser();
  const product = await createProduct({
    userId: seller.user._id,
    price: 25.5,
    ...productOverrides,
  });
  return { seller, buyer, product };
};

const checkout = ({ actor, body }) =>
  request(app)
    .post("/api/v1/orders")
    .set("Authorization", `Bearer ${actor.token}`)
    .send(body);

const act = ({ actor, orderId, action, body = {} }) =>
  request(app)
    .post(`/api/v1/orders/${orderId}/${action}`)
    .set("Authorization", `Bearer ${actor.token}`)
    .send(body);

describe("POST /api/v1/orders (checkout)", () => {
  it("turns an accepted offer into an order at the AGREED price", async () => {
    const { seller, buyer, product } = await setup();
    const offer = await negotiateToAccepted({
      buyer,
      seller,
      product,
      type: "offer",
      amountCents: 2000, // negotiated below the 2550 asking price
    });

    const res = await checkout({
      actor: buyer,
      body: { offer: offer._id, shippingAddress: ADDRESS },
    });

    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order.orderNumber).toMatch(/^ORD-/);
    expect(order.status).toBe("accepted");
    expect(order.sourceOffer).toBe(offer._id);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].unitPriceCents).toBe(2000);
    expect(order.subtotalCents).toBe(2000);
    expect(order.totalCents).toBe(2000);
    expect(order.feeCents).toBe(0);
    expect(order.sellerNetCents).toBe(2000);

    // The offer is consumed and linked to the order
    expect(String((await Offer.findById(offer._id)).order)).toBe(order._id);

    // The seller is notified the order exists
    const notif = await Notification.findOne({
      recipient: seller.user._id,
      type: "order.created",
    });
    expect(notif).not.toBeNull();
  });

  it("the agreed price is immune to listing edits after agreement", async () => {
    const { seller, buyer, product } = await setup();
    const offer = await negotiateToAccepted({ buyer, seller, product });

    // Seller pumps the listing price after agreeing
    await Product.findByIdAndUpdate(product._id, { price: 999 });

    const order = await checkoutOrder({ buyer, offer });
    expect(order.totalCents).toBe(2550); // the agreed buy-now price, not 99900
  });

  it("rejects checkout without an accepted offer - there is no bypass path", async () => {
    const { seller, buyer, product } = await setup();

    // A pending (unaccepted) offer cannot be checked out
    const pending = await request(app)
      .post("/api/v1/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product: product._id.toString(), type: "buy_now" });
    const res = await checkout({
      actor: buyer,
      body: { offer: pending.body.data._id, shippingAddress: ADDRESS },
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/requires an accepted offer/i);

    // The legacy direct-placement payload no longer exists
    const direct = await checkout({
      actor: buyer,
      body: { items: [product._id.toString()], shippingAddress: ADDRESS },
    });
    expect(direct.status).toBe(400);
  });

  it("only the offer's buyer can check out", async () => {
    const { seller, buyer, product } = await setup();
    const offer = await negotiateToAccepted({ buyer, seller, product });
    const intruder = await createUser();

    const res = await checkout({
      actor: intruder,
      body: { offer: offer._id, shippingAddress: ADDRESS },
    });
    expect(res.status).toBe(403);
  });

  it("checkout is idempotent: repeating it returns the same order", async () => {
    const { seller, buyer, product } = await setup();
    const offer = await negotiateToAccepted({ buyer, seller, product });

    const first = await checkout({
      actor: buyer,
      body: { offer: offer._id, shippingAddress: ADDRESS },
    });
    const retry = await checkout({
      actor: buyer,
      body: { offer: offer._id, shippingAddress: ADDRESS },
    });

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.data._id).toBe(first.body.data._id);
  });

  it("an expired checkout window blocks the order and releases the item", async () => {
    const { seller, buyer, product } = await setup();
    const offer = await negotiateToAccepted({ buyer, seller, product });

    await Offer.findByIdAndUpdate(offer._id, {
      checkoutExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await checkout({
      actor: buyer,
      body: { offer: offer._id, shippingAddress: ADDRESS },
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/expired/i);
    expect((await Product.findById(product._id)).status).toBe("available");
    expect((await Offer.findById(offer._id)).status).toBe("expired");
  });
});

describe("order lifecycle (post-agreement)", () => {
  const liveOrder = async () => {
    const parties = await setup();
    const offer = await negotiateToAccepted({
      buyer: parties.buyer,
      seller: parties.seller,
      product: parties.product,
    });
    const order = await checkoutOrder({ buyer: parties.buyer, offer });
    return { ...parties, orderId: order._id };
  };

  it("there is no accept/decline stage anymore - consent already happened", async () => {
    const { seller, orderId } = await liveOrder();
    const res = await act({ actor: seller, orderId, action: "accept" });
    expect(res.status).toBe(404); // route does not exist
  });

  it("cancel before shipment releases the item, either party", async () => {
    const { buyer, orderId, product } = await liveOrder();
    const res = await act({ actor: buyer, orderId, action: "cancel" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
    expect((await Product.findById(product._id)).status).toBe("available");
  });

  it("happy path: ship -> deliver settles cash, sells the item, notifies both ways", async () => {
    const { seller, buyer, orderId, product } = await liveOrder();

    const shipped = await act({
      actor: seller,
      orderId,
      action: "ship",
      body: { carrier: "Posta e Kosoves", trackingNumber: "PK123456" },
    });
    expect(shipped.status).toBe(200);
    expect(shipped.body.data.shipment.trackingNumber).toBe("PK123456");

    // Buyer got a shipment notification
    const shipNotif = await Notification.findOne({
      recipient: buyer.user._id,
      type: "order.shipped",
    });
    expect(shipNotif).not.toBeNull();

    // Only the buyer confirms receipt
    expect((await act({ actor: seller, orderId, action: "deliver" })).status).toBe(403);

    const delivered = await act({ actor: buyer, orderId, action: "deliver" });
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.status).toBe("delivered");
    expect(delivered.body.data.paymentStatus).toBe("paid");
    expect((await Product.findById(product._id)).status).toBe("sold");

    const deliveredNotif = await Notification.findOne({
      recipient: seller.user._id,
      type: "order.delivered",
    });
    expect(deliveredNotif).not.toBeNull();
  });

  it("illegal transitions are rejected; delivered is terminal", async () => {
    const { seller, buyer, orderId } = await liveOrder();

    // Cannot deliver before shipping
    expect((await act({ actor: buyer, orderId, action: "deliver" })).status).toBe(409);

    await act({ actor: seller, orderId, action: "ship" });

    // Buyer cannot cancel after shipment
    expect((await act({ actor: buyer, orderId, action: "cancel" })).status).toBe(409);

    await act({ actor: buyer, orderId, action: "deliver" });
    expect((await act({ actor: seller, orderId, action: "cancel" })).status).toBe(409);
  });

  it("strangers cannot see or act on the order", async () => {
    const { orderId } = await liveOrder();
    const stranger = await createUser();

    const view = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${stranger.token}`);
    expect(view.status).toBe(403);

    const action = await act({ actor: stranger, orderId, action: "cancel" });
    expect(action.status).toBe(403);
  });
});

describe("GET /api/v1/orders/purchases and /sales", () => {
  it("splits views by role and supports status filtering", async () => {
    const { seller, buyer, product } = await setup();
    const offer = await negotiateToAccepted({ buyer, seller, product });
    await checkoutOrder({ buyer, offer });

    const purchases = await request(app)
      .get("/api/v1/orders/purchases")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(purchases.body.count).toBe(1);

    const sales = await request(app)
      .get("/api/v1/orders/sales")
      .set("Authorization", `Bearer ${seller.token}`);
    expect(sales.body.count).toBe(1);

    const cancelled = await request(app)
      .get("/api/v1/orders/purchases?status=cancelled")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(cancelled.body.count).toBe(0);
  });
});

describe("product integration", () => {
  it("a reserved product cannot be deleted while the agreement is live", async () => {
    const { seller, buyer, product } = await setup();
    await negotiateToAccepted({ buyer, seller, product });

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active order/i);
  });
});
