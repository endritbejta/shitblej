const SavedItem = require("../models/SavedItem");
const Product = require("../models/Product");
const ErrorResponse = require("../utils/errorResponse");

// Populate the saved item's product together with the product's owner,
// mirroring how the products service exposes `user` ("name image").
const PRODUCT_POPULATE = {
  path: "product",
  populate: { path: "user", select: "name image" },
};

// @desc List saved items for a user, paginated.
exports.listSavedItems = async ({ userId, page = 1, limit = 10 }) => {
  const filter = { user: userId };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    SavedItem.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate(PRODUCT_POPULATE),
    SavedItem.countDocuments(filter),
  ]);

  const pagination = {};
  if (skip + items.length < total) pagination.next = { page: page + 1, limit };
  if (skip > 0) pagination.prev = { page: page - 1, limit };

  return { items, count: items.length, total, pagination };
};

// @desc Save a product for a user. Ownership is always bound to the
// authenticated user; never trusted from the request body.
exports.addSavedItem = async ({ userId, productId }) => {
  if (!productId) {
    throw new ErrorResponse("Please provide a product to save", 400);
  }

  // Make sure the product actually exists before saving it.
  const product = await Product.findById(productId);
  if (!product) {
    throw new ErrorResponse(`Product not found with id of ${productId}`, 404);
  }

  // Friendly duplicate message; the unique index is the safety net for
  // concurrent requests.
  const alreadySaved = await SavedItem.findOne({
    user: userId,
    product: productId,
  });
  if (alreadySaved) {
    throw new ErrorResponse("Product is already in your saved items", 400);
  }

  const savedItem = await SavedItem.create({ user: userId, product: productId });
  await savedItem.populate(PRODUCT_POPULATE);
  return savedItem;
};

// @desc Remove a saved item by product id (client-friendly unsave/toggle).
// Scoped to the user, so it can only ever remove their own.
exports.removeByProduct = async ({ userId, productId }) => {
  const savedItem = await SavedItem.findOneAndDelete({
    user: userId,
    product: productId,
  });

  if (!savedItem) {
    throw new ErrorResponse(
      `Saved item not found for product with id of ${productId}`,
      404
    );
  }
};

// @desc Remove a saved item by its own id (with ownership check).
exports.removeById = async ({ id, user }) => {
  const savedItem = await SavedItem.findById(id);
  if (!savedItem) {
    throw new ErrorResponse(`Saved item not found with id of ${id}`, 404);
  }

  if (savedItem.user.toString() !== user.id && user.role !== "admin") {
    throw new ErrorResponse(
      `User ${user.id} is not authorized to remove this saved item`,
      401
    );
  }

  await savedItem.deleteOne();
};
