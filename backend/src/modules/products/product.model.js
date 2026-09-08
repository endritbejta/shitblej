const mongoose = require("mongoose");
// Registered so the cascade hook below can reference the SavedItem model.
require("../savedItems/savedItem.model");

// Availability lifecycle of a unique second-hand item. Transitions are owned
// exclusively by product.inventory.js - nothing else may write this field.
//   available -> reserved (an active order claims the item)
//   reserved  -> available (order declined/cancelled) | sold (order delivered)
const PRODUCT_STATUS = Object.freeze({
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
});

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
  status: {
    type: String,
    enum: Object.values(PRODUCT_STATUS),
    default: PRODUCT_STATUS.AVAILABLE,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
// updatedAt only: knowing when a listing was last edited is useful, but
// letting Mongoose manage createdAt as well would make it overwrite an
// explicitly-provided value on create, which seeding and data imports depend
// on. The manual createdAt above stays authoritative.
}, { timestamps: { createdAt: false, updatedAt: true } });

// Indexes for the queries the marketplace actually runs. Before these, the
// only index on this collection was `status`, so the default listing, every
// category filter and every seller's profile page were collection scans.
//
// `createdAt: -1` leads each compound index because it is the default sort
// (see DEFAULT_SORT in product.service.js) - that lets Mongo walk the index
// in order instead of loading the matches and sorting them in memory.

// Default listing: newest first, no filter.
ProductSchema.index({ createdAt: -1 });

// Browse by category, and the same with an availability filter.
ProductSchema.index({ category: 1, createdAt: -1 });
ProductSchema.index({ category: 1, status: 1, createdAt: -1 });

// A seller's listings (profile page, "my items").
ProductSchema.index({ user: 1, createdAt: -1 });

// NOT indexed here, deliberately: /products/search runs an unanchored,
// case-insensitive regex $or across name/description/category, and no B-tree
// index can serve that - it is a collection scan and stays one for now.
//
// A MongoDB text index would be indexable but changes the semantics to
// whole-word (stemmed) matching, and the web search box queries as-you-type
// from the second character - "cam" would stop matching "Camera", and typing
// more would not bring it back. That is a product regression, not a cleanup,
// so the choice belongs to whoever owns search UX: accept word-level matching
// with a text index, or keep substring matching and move to a service built
// for it (Atlas Search autocomplete). Until then this scan is a known cost,
// bounded by pagination.

// Cascade: when a product is removed, delete any saved items that reference it
// so users don't keep dangling bookmarks. Fires on document `product.deleteOne()`.
ProductSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  await mongoose.model("SavedItem").deleteMany({ product: this._id });
  next();
});

const Product = mongoose.model("Product", ProductSchema);
Product.PRODUCT_STATUS = PRODUCT_STATUS;

module.exports = Product;
