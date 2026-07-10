const mongoose = require("mongoose");

// A SavedItem is the join between a User and a Product they've bookmarked
// ("wishlist"). It creates a many-to-many relationship: a user can save many
// products, and a product can be saved by many users.
const SavedItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A saved item must belong to a user"],
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: [true, "Please provide a product to save"],
    },
  },
  { timestamps: true }
);

// Prevent the same user from saving the same product twice. Acts as a
// database-level guard against duplicates and race conditions.
SavedItemSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("SavedItem", SavedItemSchema);
