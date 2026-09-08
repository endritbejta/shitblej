const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const {
  createUser,
  createProduct,
  negotiateToAccepted,
  checkoutOrder,
} = require("./helpers/factories");
const Offer = require("../src/modules/offers/offer.model");
const Order = require("../src/modules/orders/order.model");
const Product = require("../src/modules/products/product.model");
const scheduler = require("../src/jobs/scheduler");

beforeAll(() => db.connect());
afterEach(async () => {
  scheduler.stop();
  await db.clear();
});
afterAll(() => db.disconnect());

// Move an accepted offer's checkout window into the past, i.e. the buyer
// agreed a price and then never came back.
const lapseCheckoutWindow = (offerId) =>
  Offer.findByIdAndUpdate(offerId, {
    checkoutExpiresAt: new Date(Date.now() - 1000),
  });

describe("abandoned agreements do not strand the listing", () => {
  it("releases the reservation so the item can be sold again", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 25 });

    const offer = await negotiateToAccepted({ seller, buyer, product });
    expect((await Product.findById(product._id)).status).toBe("reserved");

    await lapseCheckoutWindow(offer._id);
    await scheduler.runSweep();

    expect((await Offer.findById(offer._id)).status).toBe("expired");
    expect((await Product.findById(product._id)).status).toBe("available");

    // The whole point: the listing is live again for other buyers.
    const options = await request(app)
      .get(`/api/v1/offers/options?product=${product._id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(options.body.data.canOffer).toBe(true);
  });

  it("lets the seller delete the listing again", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 25 });

    const offer = await negotiateToAccepted({ seller, buyer, product });

    // While reserved, deletion is correctly refused.
    const blocked = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(blocked.status).toBe(409);

    await lapseCheckoutWindow(offer._id);
    await scheduler.runSweep();

    const allowed = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(allowed.status).toBe(200);
  });

  it("expires overdue pending proposals", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 25 });

    const res = await request(app)
      .post("/api/v1/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ product: product._id.toString(), type: "offer", amountCents: 2000 });
    const offerId = res.body.data._id;

    await Offer.findByIdAndUpdate(offerId, {
      expiresAt: new Date(Date.now() - 1000),
    });

    await scheduler.runSweep();

    // Asserted on this offer, not on the sweep's totals: a straggler write
    // from an earlier test could add to those counts and has nothing to do
    // with what this test is checking.
    expect((await Offer.findById(offerId)).status).toBe("expired");
    // A pending proposal holds no reservation, so nothing is released.
    expect((await Product.findById(product._id)).status).toBe("available");
  });
});

describe("the sweep never touches a live order", () => {
  it("leaves a checked-out agreement alone even past its window", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 25 });

    const offer = await negotiateToAccepted({ seller, buyer, product });
    await checkoutOrder({ buyer, offer });

    // Window lapses after the order already exists.
    await lapseCheckoutWindow(offer._id);
    await scheduler.runSweep();

    // The offer stays accepted and the item stays reserved for the order.
    expect((await Offer.findById(offer._id)).status).toBe("accepted");
    expect((await Product.findById(product._id)).status).toBe("reserved");
  });

  it("repairs a missing offer->order link instead of releasing the item", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const product = await createProduct({ userId: seller.user._id, price: 25 });

    const offer = await negotiateToAccepted({ seller, buyer, product });
    const order = await checkoutOrder({ buyer, offer });

    // Simulate consumeAcceptedOffer having failed after the order was
    // written: the order exists but the offer never recorded it. Releasing on
    // the strength of the unset field alone would put a sold item back up.
    await Offer.findByIdAndUpdate(offer._id, { $unset: { order: 1 } });
    await lapseCheckoutWindow(offer._id);

    await scheduler.runSweep();

    expect((await Product.findById(product._id)).status).toBe("reserved");

    const repaired = await Offer.findById(offer._id);
    expect(repaired.status).toBe("accepted");
    expect(String(repaired.order)).toBe(String(order._id));
    expect(await Order.exists({ _id: order._id })).toBeTruthy();
  });
});

describe("scheduler lifecycle", () => {
  // start() sweeps once immediately (a process may have been down across a
  // window that lapsed), so stub the sweep out here - this block is about the
  // timer, and a real sweep would outlive the test.
  let sweepSpy;
  beforeEach(() => {
    const offerService = require("../src/modules/offers/offer.service");
    sweepSpy = jest
      .spyOn(offerService, "expireOffers")
      .mockResolvedValue({ expiredPending: 0, expiredAgreements: 0 });
  });
  afterEach(() => sweepSpy.mockRestore());

  it("start is idempotent and stop clears the timer", async () => {
    const first = scheduler.start({ intervalMs: 60_000 });
    const second = scheduler.start({ intervalMs: 60_000 });

    expect(second).toBe(first);

    scheduler.stop();
    // Starting again after a stop yields a fresh timer.
    const third = scheduler.start({ intervalMs: 60_000 });
    expect(third).not.toBe(first);
    scheduler.stop();
  });

  it("survives a failing sweep without throwing", async () => {
    sweepSpy.mockRejectedValue(new Error("database is down"));

    await expect(scheduler.runSweep()).resolves.toBeNull();
  });

  it("skips a tick while the previous sweep is still running", async () => {
    let release;
    sweepSpy.mockImplementation(
      () => new Promise((resolve) => {
        release = () => resolve({ expiredPending: 0, expiredAgreements: 0 });
      })
    );

    const inFlight = scheduler.runSweep();
    // A second tick landing mid-sweep must not start a concurrent pass.
    await expect(scheduler.runSweep()).resolves.toBeNull();

    release();
    await inFlight;
    expect(sweepSpy).toHaveBeenCalledTimes(1);
  });
});
