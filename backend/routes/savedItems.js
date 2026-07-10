const express = require("express");
const router = express.Router();
const {
  getSavedItems,
  addSavedItem,
  deleteSavedItem,
  deleteSavedItemByProduct,
} = require("../controllers/savedItems");

const { protect, authorize } = require("../middleware/auth");

// @route   GET  /api/v1/saved-items
// @route   POST /api/v1/saved-items
router
  .route("/")
  .get(protect, getSavedItems)
  .post(protect, authorize("user", "admin"), addSavedItem);

// Remove by product id (client-friendly toggle).
// Declared before "/:id" so "product" isn't matched as an id.
// @route   DELETE /api/v1/saved-items/product/:productId
router.delete(
  "/product/:productId",
  protect,
  authorize("user", "admin"),
  deleteSavedItemByProduct
);

// @route   DELETE /api/v1/saved-items/:id
router
  .route("/:id")
  .delete(protect, authorize("user", "admin"), deleteSavedItem);

module.exports = router;
