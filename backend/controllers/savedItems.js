const asyncHandler = require("../middleware/async");
const savedItemService = require("../services/savedItemService");

// @desc    Get all saved items for the logged-in user
// @route   GET /api/v1/saved-items
// @access  Private
exports.getSavedItems = asyncHandler(async (req, res) => {
  const { items, count, pagination } = await savedItemService.listSavedItems({
    userId: req.user.id,
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 10,
  });

  res.status(200).json({ success: true, count, pagination, data: items });
});

// @desc    Save a product for the logged-in user
// @route   POST /api/v1/saved-items
// @access  Private
exports.addSavedItem = asyncHandler(async (req, res) => {
  const savedItem = await savedItemService.addSavedItem({
    userId: req.user.id,
    productId: req.body.product,
  });

  res.status(201).json({ success: true, data: savedItem });
});

// @desc    Remove a saved item by product id (unsave)
// @route   DELETE /api/v1/saved-items/product/:productId
// @access  Private
exports.deleteSavedItemByProduct = asyncHandler(async (req, res) => {
  await savedItemService.removeByProduct({
    userId: req.user.id,
    productId: req.params.productId,
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc    Remove a saved item by its id
// @route   DELETE /api/v1/saved-items/:id
// @access  Private
exports.deleteSavedItem = asyncHandler(async (req, res) => {
  await savedItemService.removeById({ id: req.params.id, user: req.user });
  res.status(200).json({ success: true, data: {} });
});
