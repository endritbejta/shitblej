const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser } = require("./helpers/factories");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("POST /api/v1/messages", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/messages")
      .send({ receiver: "000000000000000000000000", text: "hi" });

    expect(res.status).toBe(401);
  });

  it("binds the sender to the JWT (spoofed sender is ignored)", async () => {
    const alice = await createUser();
    const bob = await createUser();

    const res = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({
        sender: bob.user._id, // spoof attempt
        receiver: bob.user._id,
        text: "hello",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sender).toBe(alice.user._id);
  });

  it("rejects an empty text", async () => {
    const alice = await createUser();
    const bob = await createUser();

    const res = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ receiver: bob.user._id, text: "" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/messages/conversations", () => {
  it("groups messages into one conversation per partner", async () => {
    const alice = await createUser();
    const bob = await createUser();

    for (const text of ["one", "two"]) {
      await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${alice.token}`)
        .send({ receiver: bob.user._id, text });
    }

    const res = await request(app)
      .get("/api/v1/messages/conversations")
      .set("Authorization", `Bearer ${alice.token}`);

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

  it("derives the caller from the JWT — a third party cannot read the thread", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const eve = await createUser();

    await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ receiver: bob.user._id, text: "secret" });

    // Bob sees the thread with Alice
    const bobView = await request(app)
      .get(`/api/v1/messages/${alice.user._id}`)
      .set("Authorization", `Bearer ${bob.token}`);
    expect(bobView.body.count).toBe(1);

    // Eve asking for Alice's thread sees only HER (empty) thread with Alice —
    // the old currentUserId query param is ignored.
    const eveView = await request(app)
      .get(`/api/v1/messages/${alice.user._id}`)
      .query({ currentUserId: bob.user._id })
      .set("Authorization", `Bearer ${eve.token}`);
    expect(eveView.body.count).toBe(0);
  });
});
