const fs = require("fs");
const mongoose = require("mongoose");
require("colors"); // patches String.prototype with .red, .green, ...

// load + validate env vars from the single source of truth
const config = require("./src/config");

// Load models
const Product = require("./src/modules/products/product.model");
const User = require("./src/modules/users/user.model");

// connect to db
mongoose.connect(config.db.uri, {});

// read JSON files
const products = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/products.json`, "utf-8")
);

const users = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/users.json`, "utf-8")
);

// import data into database
const importData = async () => {
  try {
    // Create users first
    const createdUsers = await User.create(users);
    
    // Assign a random user to each product
    const productsWithUsers = products.map((product) => {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      return { ...product, user: randomUser._id };
    });

    await Product.create(productsWithUsers);

    console.log("Data imported...".green.inverse);
    process.exit();
  } catch (error) {
    console.error(error);
  }
};

// delete data
const deleteData = async () => {
  try {
    await Product.deleteMany();
    await User.deleteMany();
    console.log("Data destroyed...".red.inverse);
    process.exit();
  } catch (error) {
    console.error(error);
  }
};

if (process.argv[2] === "-i") {
  importData();
} else if (process.argv[2] === "-d") {
  deleteData();
}
