const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const {
  createUser,
  createProduct,
  negotiateToAccepted,
} = require("./helpers/factories");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// Create a live agreement between buyer and seller so free text is unlocked.
const unlockedPair = async () => {
  const seller = await createUser();
  const buyer = await createUser();
  const product = await createProduct({ userId: seller.user._id });
  await negotiateToAccepted({ buyer, seller, product });
  return { buyer, seller, product };
};

const send = ({ actor, receiver, text }) =>
  request(app)
    .post("/api/v1/messages")
    .set("Authorization", `Bearer ${actor.token}`)
    .send({ receiver, text });

describe("messaging policy: text is gated on a live agreement", () => {
  it("blocks free text between users with no agreement", async () => {
    const alice = await createUser();
    const bob = await createUser();

    const res = await send({
      actor: alice,
      receiver: bob.user._id,
      text: "hey, is this available?",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("negotiation_required");
  });

  it("unlocks text after an accepted offer (both directions)", async () => {
    const { buyer, seller } = await unlockedPair();

    const buyerMsg = await send({
      actor: buyer,
      receiver: seller.user._id,
      text: "great, when can we meet?",
    });
    expect(buyerMsg.status).toBe(201);

    const sellerMsg = await send({
      actor: seller,
      receiver: buyer.user._id,
      text: "Saturday afternoon works",
    });
    expect(sellerMsg.status).toBe(201);
  });

  it("an agreement with a third party does not unlock strangers", async () => {
    const { buyer } = await unlockedPair();
    const stranger = await createUser();

    const res = await send({
      actor: buyer,
      receiver: stranger.user._id,
      text: "hello",
    });
    expect(res.status).toBe(403);
  });

  it("rejects messages containing contact details even when unlocked", async () => {
    const { buyer, seller } = await unlockedPair();

    for (const text of [
      "call me at +38344123456",
      "write me at endrit@example.com",
      "find me on whatsapp",
    ]) {
      const res = await send({ actor: buyer, receiver: seller.user._id, text });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/contact details/i);
    }
  });
});

describe("POST /api/v1/messages (fundamentals)", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/messages")
      .send({ receiver: "000000000000000000000000", text: "hi" });
    expect(res.status).toBe(401);
  });

  it("binds the sender to the JWT (spoofed sender is ignored)", async () => {
    const { buyer, seller } = await unlockedPair();

    const res = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        sender: seller.user._id, // spoof attempt
        receiver: seller.user._id,
        text: "hello",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sender).toBe(buyer.user._id);
  });

  it("rejects an empty text", async () => {
    const { buyer, seller } = await unlockedPair();
    const res = await send({ actor: buyer, receiver: seller.user._id, text: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/messages/conversations", () => {
  it("groups messages into one conversation per partner", async () => {
    const { buyer, seller } = await unlockedPair();

    for (const text of ["one", "two"]) {
      await send({ actor: buyer, receiver: seller.user._id, text });
    }

    const res = await request(app)
      .get("/api/v1/messages/conversations")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].lastMessage).toBe("two");
  });
});

describe("GET /api/v1/messages/:userId (IDOR fix)", () => {
  it("requires authentication", async () => {
    const res = await request(app).get(
      "/api/v1/messages/000000000000000000000000"
    );
    expect(res.status).toBe(401);
  });

  it("derives the caller from the JWT - a third party cannot read the thread", async () => {
    const { buyer, seller } = await unlockedPair();
    const eve = await createUser();

    await send({ actor: buyer, receiver: seller.user._id, text: "secret plans" });

    const sellerView = await request(app)
      .get(`/api/v1/messages/${buyer.user._id}`)
      .set("Authorization", `Bearer ${seller.token}`);
    // Thread includes negotiation offer cards plus the text message
    const texts = sellerView.body.data.filter((m) => m.type === "text");
    expect(texts).toHaveLength(1);

    const eveView = await request(app)
      .get(`/api/v1/messages/${buyer.user._id}`)
      .query({ currentUserId: seller.user._id })
      .set("Authorization", `Bearer ${eve.token}`);
    expect(eveView.body.count).toBe(0);
  });
});
