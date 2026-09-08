const mongoose = require("mongoose");
const config = require("./index");
const logger = require("../shared/logger");

const connectDB = async () => {
  const conn = await mongoose.connect(config.db.uri, {});
  logger.info({ host: conn.connection.host, db: conn.connection.name }, "mongodb connected");
};

module.exports = connectDB;
