const http = require("http");
const { Server } = require("socket.io");
const ioClient = require("socket.io-client");
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");
const domainEvents = require("../src/shared/events/domainEvents");
const logger = require("../src/shared/logger");
const registerMessageSocket = require("../src/sockets/message.socket");
const Product = require("../src/modules/products/product.model");
const Notification = require("../src/modules/notifications/notification.model");
const User = require("../src/modules/users/user.model");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe("the domain event bus contains handler failures", () => {
  const EVENT = "test.event";
  afterEach(() => domainEvents.removeAllListeners(EVENT));

  it("contains a synchronous throw", () => {
    const errorLog = jest.spyOn(logger, "error").mockImplementation(() => {});
    const after = jest.fn();

    domainEvents.on(EVENT, () => {
      throw new Error("sync handler exploded");
    });
    domainEvents.on(EVENT, after);

    expect(() => domainEvents.publish(EVENT, {})).not.toThrow();
    // A broken listener must not stop the ones registered after it.
    expect(after).toHaveBeenCalledTimes(1);
    // Contained AND reported - swallowing it silently would hide a broken
    // subscriber just as effectively as crashing would.
    expect(errorLog).toHaveBeenCalled();

    errorLog.mockRestore();
  });

  it("contains an async rejection", async () => {
    const errorLog = jest.spyOn(logger, "error").mockImplementation(() => {});
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);

    domainEvents.on(EVENT, async () => {
      throw new Error("async handler rejected");
    });

    expect(() => domainEvents.publish(EVENT, {})).not.toThrow();

    // This is the case emit()'s try/catch could not reach: the rejection used
    // to escape as an unhandledRejection, which server.js turns into
    // process.exit(1) - one broken subscriber taking the server down.
    await new Promise((resolve) => setImmediate(resolve));
    expect(unhandled).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalled();

    process.off("unhandledRejection", unhandled);
    errorLog.mockRestore();
  });

  it("still delivers payloads to healthy handlers", () => {
    const handler = jest.fn();
    domainEvents.on(EVENT, handler);

    domainEvents.publish(EVENT, { id: "abc" });

    expect(handler).toHaveBeenCalledWith({ id: "abc" });
  });
});

describe("socket auth matches the REST guarantees", () => {
  let server;
  let io;
  let url;
  let clients;

  // ONE server for the whole block, not one per test. Each listen/close cycle
  // takes an ephemeral port and gives it back, and supertest is taking
  // ephemeral ports for its own throwaway servers at the same time - churning
  // through them invited a collision, which showed up as unrelated HTTP
  // requests coming back empty.
  beforeAll(async () => {
    server = http.createServer();
    io = new Server(server);
    registerMessageSocket(io);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    io.close();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    clients = [];
  });

  // Every client is closed before the next test runs, so no connection
  // outlives the test that opened it.
  afterEach(async () => {
    await Promise.all(
      clients.map(
        (socket) =>
          new Promise((resolve) => {
            if (!socket.connected) return resolve();
            socket.on("disconnect", resolve);
            socket.close();
          })
      )
    );
    clients = [];
  });

  const connect = (token) =>
    new Promise((resolve) => {
      const socket = ioClient(url, {
        auth: { token },
        transports: ["websocket"],
        reconnection: false,
      });
      clients.push(socket);
      socket.on("connect", () => resolve({ socket, error: null }));
      socket.on("connect_error", (error) => resolve({ socket, error }));
    });

  it("rejects a connection with no token", async () => {
    const { error } = await connect(undefined);
    expect(error).toBeTruthy();
    expect(error.message).toMatch(/no token/i);
  });

  it("accepts a valid token", async () => {
    const alice = await createUser();
    const { error } = await connect(alice.token);
    expect(error).toBeNull();
  });

  it("rejects a valid token for an account that no longer exists", async () => {
    const ghost = await createUser();
    await User.findByIdAndDelete(ghost.user._id);

    // The signature is still valid; the account is gone. REST's protect
    // middleware loads the user for exactly this reason, and the socket now
    // does too.
    const { error } = await connect(ghost.token);
    expect(error).toBeTruthy();
    expect(error.message).toMatch(/invalid token/i);
  });

  it("rejects a malformed sendMessage payload", async () => {
    const alice = await createUser();
    const { socket } = await connect(alice.token);

    const failure = await new Promise((resolve) => {
      socket.on("messageError", resolve);
      socket.emit("sendMessage", { receiver: "not-an-id", text: "hi" });
    });

    // Same schema as the REST route, so this never reaches Mongoose as a
    // CastError.
    expect(failure.code).toBe("invalid_payload");
  });

  it("rejects an empty message", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { socket } = await connect(alice.token);

    const failure = await new Promise((resolve) => {
      socket.on("messageError", resolve);
      socket.emit("sendMessage", { receiver: String(bob.user._id), text: "" });
    });

    expect(failure.code).toBe("invalid_payload");
  });

  it("applies the messaging policy to socket sends", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { socket } = await connect(alice.token);

    const failure = await new Promise((resolve) => {
      socket.on("messageError", resolve);
      socket.emit("sendMessage", {
        receiver: String(bob.user._id),
        text: "hello there",
      });
    });

    // No agreement between them, so free text is gated - the socket path must
    // not be a way around the policy the REST route enforces.
    expect(failure.error).toMatch(/offer/i);
  });
});

describe("model bookkeeping", () => {
  it("records updatedAt on products without overriding createdAt", async () => {
    const { user } = await createUser();
    const backdated = new Date("2020-01-01T00:00:00.000Z");

    const product = await createProduct({
      userId: user._id,
      createdAt: backdated,
    });

    // Managing createdAt too would make Mongoose stamp "now" here, which would
    // silently break seeding and any data import.
    expect(product.createdAt.toISOString()).toBe(backdated.toISOString());
    expect(product.updatedAt).toBeInstanceOf(Date);

    const before = product.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const edited = await Product.findByIdAndUpdate(
      product._id,
      { price: 999 },
      { new: true, timestamps: true }
    );

    expect(edited.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    expect(edited.createdAt.toISOString()).toBe(backdated.toISOString());
  });

  it("declares a TTL index on notifications", async () => {
    const config = require("../src/config");
    const ttl = Notification.schema
      .indexes()
      .find(([, options]) => options && options.expireAfterSeconds);

    expect(config.notifications.ttlDays).toBeGreaterThan(0);
    expect(ttl).toBeTruthy();
    expect(ttl[1].expireAfterSeconds).toBe(
      config.notifications.ttlDays * 24 * 60 * 60
    );
  });
});
