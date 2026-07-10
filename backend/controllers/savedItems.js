const SavedItem = require("../models/SavedItem");
const Product = require("../models/Product");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

// Populate a saved item's product together with the product's owner,
// mirroring how the products controller exposes `user` ("name image").
const productPopulate = {
  path: "product",
  populate: { path: "user", select: "name image" },
};

// @desc    Get all saved items for the logged-in user
// @route   GET /api/v1/saved-items
// @access  Private
exports.getSavedItems = asyncHandler(async (req, res, next) => {
  const query = { user: req.user.id };

  // pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await SavedItem.countDocuments(query);

  const savedItems = await SavedItem.find(query)
    .sort("-createdAt")
    .skip(startIndex)
    .limit(limit)
    .populate(productPopulate);

  const pagination = {};
  if (endIndex < total) pagination.next = { page: page + 1, limit };
  if (startIndex > 0) pagination.prev = { page: page - 1, limit };

  res.status(200).json({
    success: true,
    count: savedItems.length,
    pagination,
    data: savedItems,
  });
});

// @desc    Save a product for the logged-in user
// @route   POST /api/v1/saved-items
// @access  Private
exports.addSavedItem = asyncHandler(async (req, res, next) => {
  const productId = req.body.product;

  if (!productId) {
    return next(new ErrorResponse("Please provide a product to save", 400));
  }

  // Make sure the product actually exists before saving it
  const product = await Product.findById(productId);
  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${productId}`, 404)
    );
  }

  // Prevent duplicates with a clear message (the unique index is the safety
  // net for concurrent requests)
  const alreadySaved = await SavedItem.findOne({
    user: req.user.id,
    product: productId,
  });
  if (alreadySaved) {
    return next(
      new ErrorResponse("Product is already in your saved items", 400)
    );
  }

  // Never trust the body for ownership — always bind to the authenticated user
  const savedItem = await SavedItem.create({
    user: req.user.id,
    product: productId,
  });

  await savedItem.populate(productPopulate);

  res.status(201).json({
    success: true,
    data: savedItem,
  });
});

// @desc    Remove a saved item by product id (unsave)
// @route   DELETE /api/v1/saved-items/product/:productId
// @access  Private
exports.deleteSavedItemByProduct = asyncHandler(async (req, res, next) => {
  // Scoped to the authenticated user, so it can only ever remove their own
  const savedItem = await SavedItem.findOneAndDelete({
    user: req.user.id,
    product: req.params.productId,
  });

  if (!savedItem) {
    return next(
      new ErrorResponse(
        `Saved item not found for product with id of ${req.params.productId}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Remove a saved item by its id
// @route   DELETE /api/v1/saved-items/:id
// @access  Private
exports.deleteSavedItem = asyncHandler(async (req, res, next) => {
  const savedItem = await SavedItem.findById(req.params.id);

  if (!savedItem) {
    return next(
      new ErrorResponse(`Saved item not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure the user owns this saved item (or is an admin)
  if (savedItem.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to remove this saved item`,
        401
      )
    );
  }

  await savedItem.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
