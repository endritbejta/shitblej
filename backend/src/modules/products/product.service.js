const Product = require("./product.model");
const ErrorResponse = require("../../shared/utils/errorResponse");
const { parsePagination, buildPageLinks } = require("../../shared/utils/paginate");
const domainEvents = require("../../shared/events/domainEvents");
const { PRODUCT_EVENTS } = require("./product.events");
const { destroyByUrls } = require("../../shared/utils/cloudinaryAssets");

const { PRODUCT_STATUS } = Product;

const OWNER_POPULATE = { path: "user", select: "name image" };

// Escape regex metacharacters to avoid ReDoS / invalid patterns.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------------
// Query allowlists
//
// `req.query` is attacker-controlled and Express 5's default parser hands
// through any top-level key verbatim - including Mongo operators, so
// `?$where=...` used to land in the filter as `{ $where: "..." }`. Nothing is
// copied from the query into a filter unless it appears below, so an unknown
// or hostile key can only ever be ignored.
// ---------------------------------------------------------------------------

// Case-insensitive exact match on a free-text field.
const exactInsensitive = (value) => ({
  $regex: new RegExp(`^${escapeRegex(value)}$`, "i"),
});

// String fields a client may filter on, each with its own matching rule.
const STRING_FILTERS = {
  // "starts with", case-insensitive.
  name: (value) => ({ $regex: `^${escapeRegex(value)}`, $options: "i" }),
  category: exactInsensitive,
  condition: exactInsensitive,
  brand: exactInsensitive,
  size: exactInsensitive,
  address: exactInsensitive,
  // Constrained to real statuses so this can never become an operator object.
  status: (value) =>
    Object.values(PRODUCT_STATUS).includes(value) ? value : undefined,
  // A seller's listings. Must be a well-formed id or the filter is dropped
  // (rather than reaching Mongo and throwing a CastError).
  user: (value) => (/^[0-9a-fA-F]{24}$/.test(value) ? value : undefined),
};

// Numeric fields, and the comparison operators allowed on them.
const NUMERIC_FILTERS = ["price"];
const NUMERIC_OPERATORS = ["eq", "ne", "gt", "gte", "lt", "lte"];

// Sortable fields. An arbitrary sort string is not a security problem but it
// is a 500 waiting to happen, so the surface is fixed.
const SORTABLE_FIELDS = ["createdAt", "price", "name"];
const DEFAULT_SORT = "-createdAt";

// Projectable fields. `user` is populated separately and images/description
// are what a grid needs; nothing here is sensitive.
const SELECTABLE_FIELDS = [
  "name",
  "description",
  "price",
  "category",
  "condition",
  "address",
  "size",
  "brand",
  "images",
  "status",
  "user",
  "createdAt",
];

// Translate the raw request query into a Mongo filter object. Kept private to
// the service so the HTTP layer never has to know about Mongo query syntax.
const buildFilter = (rawQuery = {}) => {
  const filter = {};

  for (const [field, match] of Object.entries(STRING_FILTERS)) {
    const raw = rawQuery[field];
    if (typeof raw !== "string" || raw === "") continue;
    const condition = match(raw);
    if (condition !== undefined) filter[field] = condition;
  }

  for (const field of NUMERIC_FILTERS) {
    // Bare form: ?price=25
    const bare = rawQuery[field];
    if (typeof bare === "string" && bare !== "" && Number.isFinite(Number(bare))) {
      filter[field] = Number(bare);
    }

    // Operator form: ?price[gte]=10&price[lte]=100. Express's "simple" query
    // parser leaves these as the literal key "price[gte]", so they are read
    // by name instead of as a nested object.
    const conditions = {};
    for (const operator of NUMERIC_OPERATORS) {
      const raw = rawQuery[`${field}[${operator}]`];
      if (typeof raw !== "string" || raw === "") continue;
      const value = Number(raw);
      if (Number.isFinite(value)) conditions[`$${operator}`] = value;
    }
    if (Object.keys(conditions).length > 0) filter[field] = conditions;
  }

  return filter;
};

// Comma-separated field list, filtered to an allowlist. Returns undefined
// when nothing usable was asked for, so the caller can skip the clause.
const buildProjection = (raw) => {
  if (typeof raw !== "string" || raw === "") return undefined;
  const fields = raw
    .split(",")
    .map((f) => f.trim())
    .filter((f) => SELECTABLE_FIELDS.includes(f));
  return fields.length > 0 ? fields.join(" ") : undefined;
};

// Comma-separated sort list; each entry may carry a leading "-" for descending.
const buildSort = (raw) => {
  if (typeof raw !== "string" || raw === "") return DEFAULT_SORT;
  const clauses = raw
    .split(",")
    .map((f) => f.trim())
    .filter((f) => SORTABLE_FIELDS.includes(f.replace(/^-/, "")));
  return clauses.length > 0 ? clauses.join(" ") : DEFAULT_SORT;
};

// @desc List products with filtering, field selection, sorting and pagination.
exports.listProducts = async (rawQuery = {}) => {
  const filter = buildFilter(rawQuery);

  const query = Product.find(filter);

  const projection = buildProjection(rawQuery.select);
  if (projection) query.select(projection);

  query.sort(buildSort(rawQuery.sort));

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
      403
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
      403
    );
  }

  // A reserved product is claimed by an accepted agreement or active order;
  // deleting it would orphan that commitment. Resolve the order first.
  if (product.status === Product.PRODUCT_STATUS.RESERVED) {
    throw new ErrorResponse(
      "This product is part of an active order and cannot be deleted",
      409
    );
  }

  // Capture the image URLs before the document goes away.
  const images = [...(product.images || [])];

  await product.deleteOne();

  // Downstream domains react (e.g. offers cancels live negotiations).
  domainEvents.publish(PRODUCT_EVENTS.DELETED, {
    productId: String(product._id),
    sellerId: product.user ? String(product.user) : undefined,
  });

  // Release the hosted images. Deliberately after the delete and not awaited:
  // the listing is already gone as far as the marketplace is concerned, and a
  // Cloudinary outage must not fail (or slow) the request. Non-Cloudinary URLs
  // are skipped, and failures are logged for later reconciliation.
  destroyByUrls(images).catch(() => {});
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
