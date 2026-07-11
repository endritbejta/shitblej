const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");
const { offerBounds, suggestedAmounts } = require("../src/modules/offers/offer.rules");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("offer.rules (pure)", () => {
  it("derives bounds and rounded, in-bounds, ascending suggestions", () => {
    // Asking price 120.00 EUR
    expect(offerBounds(12000)).toEqual({ minCents: 7200, maxCents: 12000 });

    const suggestions = suggestedAmounts(12000);
    expect(suggestions).toEqual([9000, 9500, 10000, 11000, 11500]);
    suggestions.forEach((s) => {
      expect(s % 500).toBe(0);
      expect(s).toBeGreaterThanOrEqual(7200);
      expect(s).toBeLessThanOrEqual(12000);
    });
  });
});

describe("GET /api/v1/offers/options", () => {
  const setup = async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 120 });
    return { seller, buyer, product };
  };

  const options = ({ actor, productId }) =>
    request(app)
      .get(`/api/v1/offers/options?product=${productId}`)
      .set("Authorization", `Bearer ${actor.token}`);

  it("returns the negotiation envelope for an eligible buyer", async () => {
    const { buyer, product } = await setup();
    const res = await options({ actor: buyer, productId: product._id });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      askingPriceCents: 12000,
      minCents: 7200,
      maxCents: 12000,
      canOffer: true,
    });
    expect(res.body.data.suggestedCents).toEqual([9000, 9500, 10000, 11000, 11500]);
  });

  it("flags own products, unavailable products, and existing active offers", async () => {
    const { seller, buyer, product } = await setup();

    const own = await options({ actor: seller, productId: product._id });
    expect(own.body.data).toMatchObject({ canOffer: false, reason: "own_product" });

    await request(app)
      .post("/api/v1/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product: product._id.toString(), type: "offer", amountCents: 9000 });

    const dup = await options({ actor: buyer, productId: product._id });
    expect(dup.body.data).toMatchObject({
      canOffer: false,
      reason: "active_offer_exists",
    });
    expect(dup.body.data.activeOfferId).toBeDefined();
  });
});

describe("offer amount bounds enforcement", () => {
  it("rejects lowballs below the floor on offers AND counters", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 120 });

    // Floor is 7200 (60% of 12000)
    const lowball = await request(app)
      .post("/api/v1/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product: product._id.toString(), type: "offer", amountCents: 5000 });
    expect(lowball.status).toBe(400);
    expect(lowball.body.code).toBe("offer_out_of_bounds");
    expect(lowball.body.error).toMatch(/between 72\.00 and 120\.00/);

    // A valid offer, then a lowball counter from the seller
    const offer = await request(app)
      .post("/api/v1/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product: product._id.toString(), type: "offer", amountCents: 9000 });
    const counter = await request(app)
      .post(`/api/v1/offers/${offer.body.data._id}/counter`)
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ amountCents: 100 });
    expect(counter.status).toBe(400);
    expect(counter.body.code).toBe("offer_out_of_bounds");
  });

  it("rejects offer notes containing contact details", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 120 });

    const res = await request(app)
      .post("/api/v1/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        product: product._id.toString(),
        type: "offer",
        amountCents: 9000,
        message: "call me on +38344123456",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contact details/i);
  });
});
