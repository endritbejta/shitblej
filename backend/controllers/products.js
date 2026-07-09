const Product = require("../models/Product");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res, next) => {
  const query = {};

  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ["select", "sort", "limit", "page"];
  removeFields.forEach((param) => delete reqQuery[param]);

  // Case-insensitive product name search
  if (reqQuery.name) {
    query.name = {
      $regex: `^${reqQuery.name}`,
      $options: "i"
    };
    delete reqQuery.name;
  }

  // Case-insensitive category filter
  if (reqQuery.category) {
    query.category = {
      $regex: new RegExp(`^${reqQuery.category}$`, "i")
    };
    delete reqQuery.category;
  }

  // Handle operators like price[gte], price[lte], etc.
  for (let key in reqQuery) {
    if (key.includes("[")) {
      const [field, operator] = key.split(/\[|\]/).filter(Boolean);

      if (!query[field]) query[field] = {};
      query[field][`$${operator}`] = Number(reqQuery[key]);
    } else {
      query[key] = reqQuery[key];
    }
  }

  const finalQuery = Product.find(query);

  // select
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    finalQuery.select(fields);
  }

  // sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    finalQuery.sort(sortBy);
  } else {
    finalQuery.sort("-createdAt");
  }

  // pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Product.countDocuments();

  finalQuery.skip(startIndex).limit(limit).populate("user", "name image");

  const products = await finalQuery;

  const pagination = {};
  if (endIndex < total) pagination.next = { page: page + 1, limit };
  if (startIndex > 0) pagination.prev = { page: page - 1, limit };

  res.status(200).json({
    success: true,
    count: products.length,
    pagination,
    data: products,
  });
});


// @desc    Get a single product
// @route   GET /api/v1/products/id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate("user", "name image");
  if (!product) {
    console.log("no product");
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Create product
// @route   POST /api/v1/products/
// @access  Public
exports.createProduct = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Get image URLs from Cloudinary (they're automatically uploaded)
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(file => file.path);
  } else {
    return next(new ErrorResponse('Please upload at least one image', 400));
  }

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product,
  });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Public
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is product owner
  if (product.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this product`,
        401
      )
    );
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // If the product is not found, return an error
  if (!product) {
    console.log("no product");
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Public
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is product owner
  if (product.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this product`,
        401
      )
    );
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Search products by keyword (name/description/category)
// @route   GET /api/v1/products/search?q=term&limit=10&page=1
// @access  Public
exports.searchProducts = asyncHandler(async (req, res, next) => {
  const { q = "" } = req.query;

  // Normalize/guard
  const term = String(q).trim();
  if (!term) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  // Escape regex metacharacters to avoid ReDoS / invalid patterns
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(escapeRegex(term), "i");

  // Pagination (optional; defaults)
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Build query: search across multiple fields if you like
  const query = {
    $or: [
      { name: rx },
      { description: rx },
      { category: rx },
    ],
  };

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort("-createdAt")   // match your default sorting
      .skip(skip)
      .limit(limit)
      .populate("user", "name image"),
    Product.countDocuments(query),
  ]);

  const pagination = {};
  if (skip + products.length < total) pagination.next = { page: page + 1, limit };
  if (skip > 0) pagination.prev = { page: page - 1, limit };

  res.status(200).json({
    success: true,
    count: products.length,
    pagination,
    data: products,
  });
});