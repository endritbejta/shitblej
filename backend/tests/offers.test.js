const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");
const Product = require("../src/modules/products/product.model");
const Offer = require("../src/modules/offers/offer.model");
const Message = require("../src/modules/messages/message.model");
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

const makeOffer = ({ actor, body }) =>
  request(app)
    .post("/api/v1/offers")
    .set("Authorization", `Bearer ${actor.token}`)
    .send(body);

const act = ({ actor, offerId, action, body = {} }) =>
  request(app)
    .post(`/api/v1/offers/${offerId}/${action}`)
    .set("Authorization", `Bearer ${actor.token}`)
    .send(body);

describe("POST /api/v1/offers (make offer / buy now)", () => {
  it("creates an offer, drops a card into the chat, notifies the seller", async () => {
    const { seller, buyer, product } = await setup();

    const res = await makeOffer({
      actor: buyer,
      body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
    });

    expect(res.status).toBe(201);
    const offer = res.body.data;
    expect(offer.status).toBe("pending");
    expect(offer.proposedBy).toBe("buyer");
    expect(offer.amountCents).toBe(2000);
    expect(offer.askingPriceCents).toBe(2550);
    expect(offer.productName).toBe(product.name);
    expect(offer.negotiationRoot).toBe(offer._id);

    // The product is NOT reserved by a mere proposal
    expect((await Product.findById(product._id)).status).toBe("available");

    // Offer card in the conversation
    const msg = await Message.findOne({ offer: offer._id });
    expect(msg).not.toBeNull();
    expect(msg.type).toBe("offer");
    expect(String(msg.receiver)).toBe(String(seller.user._id));

    // Persisted notification for the seller
    const notif = await Notification.findOne({ recipient: seller.user._id });
    expect(notif).not.toBeNull();
    expect(notif.type).toBe("offer.received");
    expect(notif.data.amountCents).toBe(2000);
  });

  it("buy_now proposes exactly the asking price", async () => {
    const { buyer, product } = await setup();
    const res = await makeOffer({
      actor: buyer,
      body: { product: product._id.toString(), type: "buy_now" },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.amountCents).toBe(2550);
    expect(res.body.data.type).toBe("buy_now");
  });

  it("rejects offers above asking price, on own products, and duplicates", async () => {
    const { seller, buyer, product } = await setup();

    const tooHigh = await makeOffer({
      actor: buyer,
      body: { product: product._id.toString(), type: "offer", amountCents: 9999 },
    });
    expect(tooHigh.status).toBe(400);

    const own = await makeOffer({
      actor: seller,
      body: { product: product._id.toString(), type: "buy_now" },
    });
    expect(own.status).toBe(400);

    await makeOffer({
      actor: buyer,
      body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
    });
    const dup = await makeOffer({
      actor: buyer,
      body: { product: product._id.toString(), type: "offer", amountCents: 2100 },
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/already have an active offer/i);
  });

  it("rejects offers on reserved or sold products", async () => {
    const { buyer, product } = await setup();
    await Product.findByIdAndUpdate(product._id, { status: "reserved" });

    const res = await makeOffer({
      actor: buyer,
      body: { product: product._id.toString(), type: "buy_now" },
    });
    expect(res.status).toBe(409);
  });
});

describe("negotiation: counter chains", () => {
  it("seller counters, buyer counters back, chain stays immutable", async () => {
    const { seller, buyer, product } = await setup();
    const first = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 1600 },
      })
    ).body.data;

    // Seller counters at 2200
    const counter1 = await act({
      actor: seller,
      offerId: first._id,
      action: "counter",
      body: { amountCents: 2200 },
    });
    expect(counter1.status).toBe(201);
    expect(counter1.body.data.proposedBy).toBe("seller");
    expect(counter1.body.data.previousOffer).toBe(first._id);
    expect(counter1.body.data.negotiationRoot).toBe(first._id);

    // Parent is closed forever
    expect((await Offer.findById(first._id)).status).toBe("countered");

    // Buyer counters back at 1800
    const counter2 = await act({
      actor: buyer,
      offerId: counter1.body.data._id,
      action: "counter",
      body: { amountCents: 1800 },
    });
    expect(counter2.status).toBe(201);
    expect(counter2.body.data.proposedBy).toBe("buyer");

    // Chain endpoint returns the full history, oldest first
    const chain = await request(app)
      .get(`/api/v1/offers/${first._id}/negotiation`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(chain.body.count).toBe(3);
    expect(chain.body.data.map((o) => o.amountCents)).toEqual([1600, 2200, 1800]);

    // A resolved offer cannot be acted on again
    const reuse = await act({
      actor: seller,
      offerId: first._id,
      action: "accept",
    });
    expect(reuse.status).toBe(409);
  });

  it("only the recipient of the current proposal can respond", async () => {
    const { seller, buyer, product } = await setup();
    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 1600 },
      })
    ).body.data;

    // The buyer proposed - the buyer cannot accept their own proposal
    const selfAccept = await act({ actor: buyer, offerId: offer._id, action: "accept" });
    expect(selfAccept.status).toBe(403);

    // A stranger can do nothing at all
    const stranger = await createUser();
    const strangerAccept = await act({
      actor: stranger,
      offerId: offer._id,
      action: "accept",
    });
    expect(strangerAccept.status).toBe(403);
  });

  it("the proposer (and only the proposer) can cancel a live proposal", async () => {
    const { seller, buyer, product } = await setup();
    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 1600 },
      })
    ).body.data;

    const sellerCancel = await act({ actor: seller, offerId: offer._id, action: "cancel" });
    expect(sellerCancel.status).toBe(403);

    const buyerCancel = await act({ actor: buyer, offerId: offer._id, action: "cancel" });
    expect(buyerCancel.status).toBe(200);
    expect(buyerCancel.body.data.status).toBe("cancelled");
  });
});

describe("acceptance: agreement reserves the item", () => {
  it("accepting reserves the product and auto-declines rival offers", async () => {
    const { seller, buyer, product } = await setup();
    const rivalBuyer = await createUser();

    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
      })
    ).body.data;
    const rival = (
      await makeOffer({
        actor: rivalBuyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 2200 },
      })
    ).body.data;

    const res = await act({ actor: seller, offerId: offer._id, action: "accept" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("accepted");
    expect(res.body.data.checkoutExpiresAt).toBeDefined();

    // Item is reserved by the agreement
    expect((await Product.findById(product._id)).status).toBe("reserved");

    // The rival's offer died with it, and the rival was told
    expect((await Offer.findById(rival._id)).status).toBe("declined");
    const superseded = await Notification.findOne({
      recipient: rivalBuyer.user._id,
      type: "offer.superseded",
    });
    expect(superseded).not.toBeNull();
  });

  it("cannot accept when the product was already claimed elsewhere", async () => {
    const { seller, buyer, product } = await setup();
    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
      })
    ).body.data;

    // Another agreement claimed the item in the meantime
    await Product.findByIdAndUpdate(product._id, { status: "reserved" });

    const res = await act({ actor: seller, offerId: offer._id, action: "accept" });
    expect(res.status).toBe(409);
    expect((await Offer.findById(offer._id)).status).toBe("pending");
  });

  it("declining notifies the proposer and releases nothing", async () => {
    const { seller, buyer, product } = await setup();
    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
      })
    ).body.data;

    const res = await act({ actor: seller, offerId: offer._id, action: "decline" });
    expect(res.status).toBe(200);
    expect((await Product.findById(product._id)).status).toBe("available");

    const notif = await Notification.findOne({
      recipient: buyer.user._id,
      type: "offer.declined",
    });
    expect(notif).not.toBeNull();
  });
});

describe("expiration", () => {
  it("an overdue pending offer expires lazily on response", async () => {
    const { seller, buyer, product } = await setup();
    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
      })
    ).body.data;

    await Offer.findByIdAndUpdate(offer._id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await act({ actor: seller, offerId: offer._id, action: "accept" });
    expect(res.status).toBe(409);
    expect((await Offer.findById(offer._id)).status).toBe("expired");
  });

  it("the sweep releases reservations from stale agreements", async () => {
    const { seller, buyer, product } = await setup();
    const offerService = require("../src/modules/offers/offer.service");

    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "buy_now" },
      })
    ).body.data;
    await act({ actor: seller, offerId: offer._id, action: "accept" });
    expect((await Product.findById(product._id)).status).toBe("reserved");

    // Buyer never checks out; the window lapses
    await Offer.findByIdAndUpdate(offer._id, {
      checkoutExpiresAt: new Date(Date.now() - 1000),
    });
    await offerService.expireOffers();

    expect((await Offer.findById(offer._id)).status).toBe("expired");
    expect((await Product.findById(product._id)).status).toBe("available");
  });
});

describe("listing deletion during negotiation", () => {
  it("cancels live offers and notifies the buyers", async () => {
    const { seller, buyer, product } = await setup();
    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
      })
    ).body.data;

    const del = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(del.status).toBe(200);

    // Event handling is async fire-and-forget; give it a tick
    await new Promise((r) => setTimeout(r, 50));

    expect((await Offer.findById(offer._id)).status).toBe("cancelled");
    const notif = await Notification.findOne({
      recipient: buyer.user._id,
      type: "offer.cancelled",
    });
    expect(notif).not.toBeNull();
  });
});

describe("chat thread integration", () => {
  it("the conversation returns offer cards with live offer state", async () => {
    const { seller, buyer, product } = await setup();
    const offer = (
      await makeOffer({
        actor: buyer,
        body: { product: product._id.toString(), type: "offer", amountCents: 2000 },
      })
    ).body.data;
    await act({ actor: seller, offerId: offer._id, action: "accept" });

    const thread = await request(app)
      .get(`/api/v1/messages/${seller.user._id}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(thread.status).toBe(200);
    const offerMessages = thread.body.data.filter((m) => m.type === "offer");
    // One card for the proposal, one for the acceptance
    expect(offerMessages).toHaveLength(2);
    // Cards carry the populated offer in its CURRENT state
    expect(offerMessages[0].offer.status).toBe("accepted");
    expect(offerMessages[0].offer.amountCents).toBe(2000);
  });
});
