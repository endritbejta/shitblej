const mongoose = require("mongoose");
const geocoder = require("../utils/geocoder");
const { type } = require("os");

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    maxlength: [50, "Name cannot be more than 50 characters"],
    required: [true, "Please add a product name"],
  },
  description: {
    type: String,
    maxlength: [500, "Name cannot be more than 500 characters"],
  },
  price: {
    type: Number,
    required: [true, "Please add a price"],
  },
  category: {
    type: String,
    required: [true, "Please specify a category"],
    enum: [
      "ladies",
      "men",
      "designer-items",
      "children",
      "home",
      "electronics",
      "entertainment",
      "hobby-collector",
      "sport",
    ],
  },
  condition: {
    type: String,
    required: [true, "Please specify the condition"],
    enum: [
      "New",
      "Used - Like New",
      "Used - Very Good",
      "Used - Good",
      "Used - Acceptable",
    ],
  },
  address: {
    type: String,
  },
  //   location: {
  //     type: {
  //       type: String,
  //       enum: "Point",
  //     },
  //     coordinates: {
  //       type: [Number],
  //       index: "2dsphere",
  //     },
  //     formattedAddress: String,
  //     street: String,
  //     city: String,
  //     state: String,
  //     zipcode: String,
  //     country: String,
  //   },
  size: {
    type: String,
  },
  brand: {
    type: String,
  },
  images: {
    type: [String],
    required: [true, "Please add at least one image"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Geocode create location
// ProductSchema.pre("save", async function (next) {
//   const loc = await geocoder.geocode(this.address);
//   this.location = {
//     type: "Point",
//     coordinates: [loc[0].longitude, loc[0].latitude],
//     formattedAddress: loc[0].formattedAddress,
//     street: loc[0].streetName,
//     zipcode: loc[0].zipcode,
//     city: loc[0].city,
//     state: loc[0].state,
//     country: loc[0].country,
//   };
//   this.address = undefined;
//   next();
// });
module.exports = mongoose.model("Product", ProductSchema);
