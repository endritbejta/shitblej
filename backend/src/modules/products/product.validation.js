const { z } = require("zod");
const { objectId } = require("../../shared/validators/common");

// Enums mirror the Product model so the messages stay in sync with what the
// database will accept.
const CATEGORIES = [
  "ladies",
  "men",
  "designer-items",
  "children",
  "home",
  "electronics",
  "entertainment",
  "hobby-collector",
  "sport",
];

const CONDITIONS = [
  "New",
  "Used - Like New",
  "Used - Very Good",
  "Used - Good",
  "Used - Acceptable",
];

const name = z
  .string()
  .trim()
  .min(1, "Please add a product name")
  .max(50, "Name cannot be more than 50 characters");

const description = z
  .string()
  .trim()
  .max(500, "Description cannot be more than 500 characters");

// Product create/update arrive as multipart/form-data (multer), so numbers
// come in as strings — coerce before checking.
const price = z.coerce
  .number({ message: "Price must be a number" })
  .positive("Price must be greater than 0");

const category = z.enum(CATEGORIES, {
  message: `Category must be one of: ${CATEGORIES.join(", ")}`,
});

const condition = z.enum(CONDITIONS, {
  message: `Condition must be one of: ${CONDITIONS.join(", ")}`,
});

exports.createProductSchema = {
  body: z
    .object({
      name,
      description: description.optional(),
      price,
      category,
      condition,
      address: z.string().trim().optional(),
      size: z.string().trim().optional(),
      brand: z.string().trim().optional(),
    })
    // Only whitelisted fields reach Product.create — blocks `user` (ownership)
    // injection through the payload; the controller sets it from the JWT.
    .strip(),
};

exports.updateProductSchema = {
  params: z.object({ id: objectId("product id") }),
  body: z
    .object({
      name: name.optional(),
      description: description.optional(),
      price: price.optional(),
      category: category.optional(),
      condition: condition.optional(),
      address: z.string().trim().optional(),
      size: z.string().trim().optional(),
      brand: z.string().trim().optional(),
    })
    .strip(),
};

exports.productIdParamSchema = {
  params: z.object({ id: objectId("product id") }),
};
