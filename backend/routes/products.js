const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/products");

const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { upload } = require("../config/cloudinary");
const {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} = require("../validators/productValidators");

// @route   GET /api/v1/products/search
// @access  Public
router.get("/search", searchProducts);

// @route   GET  /api/v1/products
// @route   POST /api/v1/products
router
  .route("/")
  .get(getProducts)
  .post(
    protect,
    authorize("user", "admin"),
    // multer runs before validation so multipart fields exist on req.body
    upload.array("images", 5),
    validate(createProductSchema),
    createProduct
  );

// @route   GET    /api/v1/products/:id
// @route   PUT    /api/v1/products/:id
// @route   DELETE /api/v1/products/:id
router
  .route("/:id")
  .get(validate(productIdParamSchema), getProduct)
  .put(
    protect,
    authorize("user", "admin"),
    validate(updateProductSchema),
    updateProduct
  )
  .delete(
    protect,
    authorize("user", "admin"),
    validate(productIdParamSchema),
    deleteProduct
  );

module.exports = router;
