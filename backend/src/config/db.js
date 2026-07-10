const mongoose = require("mongoose");
const config = require("./index");

const connectDB = async () => {
  const conn = await mongoose.connect(config.db.uri, {});
  console.log(`MongoDB connected: ${conn.connection.host}`.cyan.underline.bold);
};

module.exports = connectDB;
