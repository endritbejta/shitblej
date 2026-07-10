const mongoose = require("mongoose");
// Registered so the cascade hook below can reference the SavedItem model.
require("../savedItems/savedItem.model");

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

// Cascade: when a product is removed, delete any saved items that reference it
// so users don't keep dangling bookmarks. Fires on document `product.deleteOne()`.
ProductSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  await mongoose.model("SavedItem").deleteMany({ product: this._id });
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
