const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

// Boot an in-memory MongoDB and point mongoose at it. Call in beforeAll.
exports.connect = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), {});
};

// Wipe every collection between tests so each test starts clean.
exports.clear = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
};

// Tear down mongoose + the in-memory server. Call in afterAll.
exports.disconnect = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};
