const Product = require("./product.model");
const ErrorResponse = require("../../shared/utils/errorResponse");
const { parsePagination, buildPageLinks } = require("../../shared/utils/paginate");

// Fields that are not part of the filter but control the shape of the query.
const RESERVED_QUERY_FIELDS = ["select", "sort", "limit", "page"];

const OWNER_POPULATE = { path: "user", select: "name image" };

// Escape regex metacharacters to avoid ReDoS / invalid patterns.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Translate the raw request query into a Mongo filter object. Kept private to
// the service so the HTTP layer never has to know about Mongo query syntax.
const buildFilter = (rawQuery) => {
  const filter = {};
  const reqQuery = { ...rawQuery };

  RESERVED_QUERY_FIELDS.forEach((param) => delete reqQuery[param]);

  // Case-insensitive "starts with" product name search.
  if (reqQuery.name) {
    filter.name = { $regex: `^${escapeRegex(reqQuery.name)}`, $options: "i" };
    delete reqQuery.name;
  }

  // Case-insensitive exact category filter.
  if (reqQuery.category) {
    filter.category = {
      $regex: new RegExp(`^${escapeRegex(reqQuery.category)}$`, "i"),
    };
    delete reqQuery.category;
  }

  // Support operators like price[gte], price[lte], etc.
  for (const key in reqQuery) {
    if (key.includes("[")) {
      const [field, operator] = key.split(/\[|\]/).filter(Boolean);
      if (!filter[field]) filter[field] = {};
      filter[field][`$${operator}`] = Number(reqQuery[key]);
    } else {
      filter[key] = reqQuery[key];
    }
  }

  return filter;
};

// @desc List products with filtering, field selection, sorting and pagination.
exports.listProducts = async (rawQuery = {}) => {
  const filter = buildFilter(rawQuery);

  const query = Product.find(filter);

  if (rawQuery.select) {
    query.select(rawQuery.select.split(",").join(" "));
  }

  query.sort(rawQuery.sort ? rawQuery.sort.split(",").join(" ") : "-createdAt");

  const { page, limit, skip } = parsePagination(rawQuery);

  const [products, total] = await Promise.all([
    query.skip(skip).limit(limit).populate(OWNER_POPULATE),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    count: products.length,
    total,
    pagination: buildPageLinks({
      page,
      limit,
      skip,
      total,
      returned: products.length,
    }),
  };
};

// @desc Get a single product by id (throws 404 when missing).
exports.getProductById = async (id) => {
  const product = await Product.findById(id).populate(OWNER_POPULATE);
  if (!product) {
    throw new ErrorResponse(`Product not found with id of ${id}`, 404);
  }
  return product;
};

// @desc Create a product owned by the given user.
exports.createProduct = async ({ data, userId, images }) => {
  if (!images || images.length === 0) {
    throw new ErrorResponse("Please upload at least one image", 400);
  }

  return Product.create({ ...data, images, user: userId });
};

// @desc Update a product the user owns (or admin).
exports.updateProduct = async ({ id, updates, user }) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ErrorResponse(`Product not found with id of ${id}`, 404);
  }

  if (product.user.toString() !== user.id && user.role !== "admin") {
    throw new ErrorResponse(
      `User ${user.id} is not authorized to update this product`,
      401
    );
  }

  return Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
};

// @desc Delete a product the user owns (or admin). Fires the cascade hook.
exports.deleteProduct = async ({ id, user }) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ErrorResponse(`Product not found with id of ${id}`, 404);
  }

  if (product.user.toString() !== user.id && user.role !== "admin") {
    throw new ErrorResponse(
      `User ${user.id} is not authorized to delete this product`,
      401
    );
  }

  await product.deleteOne();
};

// @desc Keyword search across name / description / category.
exports.searchProducts = async (rawQuery = {}) => {
  const term = String(rawQuery.q ?? "").trim();
  if (!term) {
    return { products: [], count: 0, total: 0, pagination: {} };
  }

  const rx = new RegExp(escapeRegex(term), "i");
  const filter = {
    $or: [{ name: rx }, { description: rx }, { category: rx }],
  };

  const { page, limit, skip } = parsePagination(rawQuery);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate(OWNER_POPULATE),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    count: products.length,
    total,
    pagination: buildPageLinks({
      page,
      limit,
      skip,
      total,
      returned: products.length,
    }),
  };
};
