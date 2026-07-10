const express = require("express");
const router = express.Router();
const {
  getSavedItems,
  addSavedItem,
  deleteSavedItem,
  deleteSavedItemByProduct,
} = require("./savedItem.controller");

const { protect, authorize } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  addSavedItemSchema,
  savedItemIdParamSchema,
  savedItemProductParamSchema,
} = require("./savedItem.validation");

// @route   GET  /api/v1/saved-items
// @route   POST /api/v1/saved-items
router
  .route("/")
  .get(protect, getSavedItems)
  .post(
    protect,
    authorize("user", "admin"),
    validate(addSavedItemSchema),
    addSavedItem
  );

// Remove by product id (client-friendly toggle).
// Declared before "/:id" so "product" isn't matched as an id.
// @route   DELETE /api/v1/saved-items/product/:productId
router.delete(
  "/product/:productId",
  protect,
  authorize("user", "admin"),
  validate(savedItemProductParamSchema),
  deleteSavedItemByProduct
);

// @route   DELETE /api/v1/saved-items/:id
router
  .route("/:id")
  .delete(
    protect,
    authorize("user", "admin"),
    validate(savedItemIdParamSchema),
    deleteSavedItem
  );

module.exports = router;
