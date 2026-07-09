const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts
} = require("../controllers/products");

const { protect, authorize } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

// @route   GET /api/v1/products/search
// @access  Public
router.get("/search", searchProducts);

// @route   GET /api/v1/products/
// @route   POST /api/v1/products/
// @route   GET /api/v1/products/:id
// @route   PUT /api/v1/products/:id
// @route   DELETE /api/v1/products/:id
router
  .route("/")
  .get(getProducts)
  .post(protect, authorize("user", "admin"), upload.array('images', 5), createProduct);

router
  .route("/:id")
  .get(getProduct)
  .put(protect, authorize("user", "admin"), updateProduct)
  .delete(protect, authorize("user", "admin"), deleteProduct);


module.exports = router;
