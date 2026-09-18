const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  suggestListing,
} = require("./product.controller");

// No role check here on purpose: the role enum is ["user", "admin"], so
// authorize("user", "admin") admitted everyone - a middleware that read like
// an access control while enforcing nothing. Ownership is the actual control
// and it is enforced in product.service.js, which compares product.user to
// the caller and exempts admins.
const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { publicRead } = require("../../middleware/cache");
const { createRateLimiter } = require("../../middleware/rateLimit");
const config = require("../../config");
const { upload } = require("../../config/upload");
const {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  suggestListingSchema,
} = require("./product.validation");

// @route   GET /api/v1/products/search
// @access  Public
router.get("/search", publicRead(), searchProducts);

// @route   POST /api/v1/products/suggest
// @access  Private
//
// Declared before /:id so "suggest" is not parsed as a product id.
//
// Three pieces of middleware here that no other route needs:
//
//   suggestLimiter - this is the only endpoint that costs money per call, so
//     it gets its own much tighter counter rather than sharing the general API
//     allowance (see config.rateLimit.suggestMax).
//
//   (The larger JSON body limit this endpoint needs is mounted in app.js, ahead
//   of the global 32kb parser - see the comment there.)
//
//   protect        - anonymous access would make a paid endpoint free to
//     anyone who can find it.
const suggestLimiter = createRateLimiter({
  name: "suggest",
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.suggestMax,
});

router.post(
  "/suggest",
  protect,
  suggestLimiter,
  validate(suggestListingSchema),
  suggestListing
);

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
