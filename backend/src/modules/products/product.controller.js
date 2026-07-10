const asyncHandler = require("../../middleware/async");
const productService = require("./product.service");

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const { products, count, pagination } = await productService.listProducts(
    req.query
  );

  res.status(200).json({ success: true, count, pagination, data: products });
});

// @desc    Get a single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  res.status(200).json({ success: true, data: product });
});

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private
exports.createProduct = asyncHandler(async (req, res) => {
  // Cloudinary has already uploaded the files; `path` is the hosted URL.
  const images = (req.files || []).map((file) => file.path);

  const product = await productService.createProduct({
    data: req.body,
    userId: req.user.id,
    images,
  });

  res.status(201).json({ success: true, data: product });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct({
    id: req.params.id,
    updates: req.body,
    user: req.user,
  });

  res.status(200).json({ success: true, data: product });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private
exports.deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct({ id: req.params.id, user: req.user });
  res.status(200).json({ success: true, data: {} });
});

// @desc    Search products by keyword (name/description/category)
// @route   GET /api/v1/products/search?q=term&limit=10&page=1
// @access  Public
exports.searchProducts = asyncHandler(async (req, res) => {
  const { products, count, pagination } = await productService.searchProducts(
    req.query
  );

  res.status(200).json({ success: true, count, pagination, data: products });
});
