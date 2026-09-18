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

// --- Listing suggestions (POST /products/suggest) ---------------------------
//
// The listing-ai service validates all of this again and is the authority on
// what it accepts. Checking here anyway is about our own resources, not its:
// a malformed or oversized body should be refused before it becomes an
// outbound request and a paid model call.

const SUGGESTION_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Matches listing-ai's MAX_IMAGE_BYTES default. Kept in sync by
// tests/listingSuggestions.test.js rather than by memory.
const MAX_SUGGESTION_IMAGE_BYTES = 5 * 1024 * 1024;

// Decoded size of a base64 string, without allocating the buffer to find out.
// Every 4 characters encode 3 bytes; trailing '=' padding encodes nothing.
const base64ByteLength = (data) => {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
};

exports.MAX_SUGGESTION_IMAGE_BYTES = MAX_SUGGESTION_IMAGE_BYTES;

// What the JSON body carrying that image needs: base64 inflates by 4/3, plus
// room for the envelope and the hint. Derived here rather than in app.js so the
// parser limit cannot drift from the size the validator enforces - and so the
// oversized case is refused by validate() with a useful message rather than by
// the parser with a bare 413.
exports.SUGGESTION_BODY_LIMIT_BYTES =
  Math.ceil((MAX_SUGGESTION_IMAGE_BYTES * 4) / 3) + 64 * 1024;
exports.SUGGESTION_IMAGE_TYPES = SUGGESTION_IMAGE_TYPES;

exports.suggestListingSchema = {
  body: z
    .object({
      image: z.object({
        kind: z.literal("base64", {
          message: "Only base64 image data is accepted here",
        }),
        mediaType: z.enum(SUGGESTION_IMAGE_TYPES, {
          message: `Image must be one of: ${SUGGESTION_IMAGE_TYPES.join(", ")}`,
        }),
        data: z
          .string()
          .min(1, "Image data is empty")
          .refine(
            (value) => base64ByteLength(value) <= MAX_SUGGESTION_IMAGE_BYTES,
            `Image must be ${MAX_SUGGESTION_IMAGE_BYTES / (1024 * 1024)}MB or smaller`
          ),
      }),
      // Whatever the seller has already typed into the form. Optional, and
      // capped so it cannot become an unbounded prompt-injection surface.
      hint: z.string().trim().max(200).optional(),
    })
    .strip(),
};
