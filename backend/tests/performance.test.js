const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const {
  createUser,
  createProduct,
  negotiateToAccepted,
} = require("./helpers/factories");
const Message = require("../src/modules/messages/message.model");
const Product = require("../src/modules/products/product.model");
const messageService = require("../src/modules/messages/message.service");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// A pair with a live agreement, so free text is unlocked between them.
const unlockedPair = async () => {
  const seller = await createUser();
  const buyer = await createUser();
  const product = await createProduct({ userId: seller.user._id });
  await negotiateToAccepted({ buyer, seller, product });
  return { buyer, seller };
};

describe("conversation list is grouped in the database", () => {
  it("returns one row per partner, newest conversation first", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const carol = await createUser();

    // Seeded directly: this is about the read path, not the send policy.
    await Message.create([
      { sender: alice.user._id, receiver: bob.user._id, text: "to bob 1", createdAt: new Date(Date.now() - 5000) },
      { sender: bob.user._id, receiver: alice.user._id, text: "from bob", createdAt: new Date(Date.now() - 4000) },
      { sender: carol.user._id, receiver: alice.user._id, text: "from carol", createdAt: new Date(Date.now() - 1000) },
    ]);

    const res = await request(app)
      .get("/api/v1/messages/conversations")
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    // Carol's is the most recent exchange.
    expect(res.body.data[0].name).toBe(carol.user.name);
    expect(res.body.data[0].lastMessage).toBe("from carol");
    // Bob's row shows the latest message in that thread, whoever sent it.
    expect(res.body.data[1].name).toBe(bob.user.name);
    expect(res.body.data[1].lastMessage).toBe("from bob");
  });

  it("reads the collection once rather than once per message", async () => {
    const alice = await createUser();
    const bob = await createUser();

    const many = Array.from({ length: 60 }, (_, i) => ({
      sender: i % 2 ? alice.user._id : bob.user._id,
      receiver: i % 2 ? bob.user._id : alice.user._id,
      text: `message ${i}`,
      createdAt: new Date(Date.now() - (60 - i) * 1000),
    }));
    await Message.create(many);

    // The old implementation issued a find() that returned every message and
    // populated both parties on each. Assert on the shape of the database
    // work: exactly one aggregate, and no find() at all.
    const aggregateSpy = jest.spyOn(Message, "aggregate");
    const findSpy = jest.spyOn(Message, "find");

    const res = await request(app)
      .get("/api/v1/messages/conversations")
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].lastMessage).toBe("message 59");

    expect(aggregateSpy).toHaveBeenCalledTimes(1);
    expect(findSpy).not.toHaveBeenCalled();

    // The result is one row per partner, not one per message.
    expect(res.body.data).toHaveLength(1);

    aggregateSpy.mockRestore();
    findSpy.mockRestore();
  });

  it("survives a partner whose account was deleted", async () => {
    const alice = await createUser();
    const ghostId = new mongoose.Types.ObjectId();

    await Message.create({
      sender: ghostId,
      receiver: alice.user._id,
      text: "sent before the account went away",
    });

    const res = await request(app)
      .get("/api/v1/messages/conversations")
      .set("Authorization", `Bearer ${alice.token}`);

    // Populating a dangling ref used to throw; the conversation must survive.
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].name).toBe("Deleted user");
  });
});

describe("thread pagination is opt-in", () => {
  it("returns the whole thread when no limit is given", async () => {
    const { buyer, seller } = await unlockedPair();

    const texts = Array.from({ length: 12 }, (_, i) => `line ${i}`);
    for (const [i, text] of texts.entries()) {
      await Message.create({
        sender: buyer.user._id,
        receiver: seller.user._id,
        text,
        createdAt: new Date(Date.now() + i),
      });
    }

    const thread = await messageService.getConversationBetween({
      userA: buyer.user._id,
      userB: seller.user._id,
    });

    // 12 seeded, plus the two offer cards the negotiation posts (the buyer's
    // proposal and the seller's acceptance).
    expect(thread.length).toBe(14);
  });

  it("returns the most recent slice, still oldest-first", async () => {
    const alice = await createUser();
    const bob = await createUser();

    for (let i = 0; i < 10; i++) {
      await Message.create({
        sender: alice.user._id,
        receiver: bob.user._id,
        text: `line ${i}`,
        createdAt: new Date(Date.now() + i * 1000),
      });
    }

    const page = await messageService.getConversationBetween({
      userA: alice.user._id,
      userB: bob.user._id,
      limit: 3,
    });

    expect(page.map((m) => m.text)).toEqual(["line 7", "line 8", "line 9"]);
  });

  it("walks backwards through older pages", async () => {
    const alice = await createUser();
    const bob = await createUser();

    for (let i = 0; i < 10; i++) {
      await Message.create({
        sender: alice.user._id,
        receiver: bob.user._id,
        text: `line ${i}`,
        createdAt: new Date(Date.now() + i * 1000),
      });
    }

    const older = await messageService.getConversationBetween({
      userA: alice.user._id,
      userB: bob.user._id,
      limit: 3,
      page: 2,
    });

    expect(older.map((m) => m.text)).toEqual(["line 4", "line 5", "line 6"]);
  });

  it("caps the page size", async () => {
    const alice = await createUser();
    const bob = await createUser();
    await Message.create({
      sender: alice.user._id,
      receiver: bob.user._id,
      text: "only one",
    });

    const page = await messageService.getConversationBetween({
      userA: alice.user._id,
      userB: bob.user._id,
      limit: 100000,
    });

    expect(page.length).toBe(1);
  });
});

describe("product indexes back the queries that run", () => {
  it("declares indexes for the default listing, category, and seller", async () => {
    await Product.syncIndexes();
    const indexes = await Product.collection.indexes();
    const keys = indexes.map((i) => JSON.stringify(i.key));

    expect(keys).toContain(JSON.stringify({ createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ category: 1, createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ user: 1, createdAt: -1 }));
  });

  it("uses an index instead of scanning for the default listing", async () => {
    const { user } = await createUser();
    for (let i = 0; i < 5; i++) await createProduct({ userId: user._id });
    await Product.syncIndexes();

    const plan = await Product.find({})
      .sort("-createdAt")
      .limit(10)
      .explain("queryPlanner");

    const stage = plan.queryPlanner.winningPlan;
    // An in-memory SORT stage is what the missing index used to force.
    expect(JSON.stringify(stage)).not.toMatch(/"stage":"SORT"/);
  });

  it("uses an index for a category filter", async () => {
    const { user } = await createUser();
    await createProduct({ userId: user._id, category: "electronics" });
    await Product.syncIndexes();

    const plan = await Product.find({ category: "electronics" })
      .sort("-createdAt")
      .explain("queryPlanner");

    expect(JSON.stringify(plan.queryPlanner.winningPlan)).toMatch(/IXSCAN/);
  });
});

describe("message indexes cover both sides of the inbox", () => {
  it("declares an index for the receiver branch of the $or", async () => {
    await Message.syncIndexes();
    const keys = (await Message.collection.indexes()).map((i) =>
      JSON.stringify(i.key)
    );

    expect(keys).toContain(JSON.stringify({ receiver: 1, createdAt: -1 }));
    expect(keys).toContain(
      JSON.stringify({ sender: 1, receiver: 1, createdAt: 1 })
    );
  });
});
