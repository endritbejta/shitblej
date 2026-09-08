const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require("./product.controller");

// No role check here on purpose: the role enum is ["user", "admin"], so
// authorize("user", "admin") admitted everyone - a middleware that read like
// an access control while enforcing nothing. Ownership is the actual control
// and it is enforced in product.service.js, which compares product.user to
// the caller and exempts admins.
const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { publicRead } = require("../../middleware/cache");
const { upload } = require("../../config/cloudinary");
const {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} = require("./product.validation");

// @route   GET /api/v1/products/search
// @access  Public
router.get("/search", publicRead(), searchProducts);

// @route   GET  /api/v1/products
// @route   POST /api/v1/products
router
  .route("/")
  .get(publicRead(), getProducts)
  .post(
    protect,
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
  .get(publicRead(), validate(productIdParamSchema), getProduct)
  .put(
    protect,
    validate(updateProductSchema),
    updateProduct
  )
  .delete(
    protect,
    validate(productIdParamSchema),
    deleteProduct
  );

module.exports = router;
