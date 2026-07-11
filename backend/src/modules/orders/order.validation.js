const { z } = require("zod");
const { objectId } = require("../../shared/validators/common");
const { ORDER_STATUS, MAX_ITEMS_PER_ORDER } = require("./order.constants");

const shippingAddress = z
  .object({
    fullName: z.string().trim().min(1, "fullName cannot be empty"),
    street: z.string().trim().min(1, "street cannot be empty"),
    city: z.string().trim().min(1, "city cannot be empty"),
    postalCode: z.string().trim().min(1, "postalCode cannot be empty"),
    country: z.string().trim().min(1).default("Kosovo"),
    phone: z.string().trim().min(1, "phone cannot be empty"),
  })
  .strip();

const note = z.string().trim().max(500).optional();

exports.placeOrderSchema = {
  body: z
    .object({
      // Item ids are deduplicated rather than rejected: double-tapping "buy"
      // in a UI cart should not fail the whole checkout.
      items: z
        .array(objectId("item"))
        .min(1, "An order must contain at least one item")
        .max(MAX_ITEMS_PER_ORDER)
        .transform((ids) => [...new Set(ids)]),
      shippingAddress,
      note,
      // Optional client-generated key that makes placement retry-safe.
      idempotencyKey: z.string().trim().min(8).max(128).optional(),
      // Amounts are intentionally NOT accepted - pricing is server-side only.
    })
    .strip(),
};

exports.orderIdParamSchema = {
  params: z.object({ id: objectId("order id") }),
};

exports.actionSchema = {
  params: z.object({ id: objectId("order id") }),
  body: z.object({ note }).strip(),
};

exports.shipSchema = {
  params: z.object({ id: objectId("order id") }),
  body: z
    .object({
      note,
      carrier: z.string().trim().max(100).optional(),
      trackingNumber: z.string().trim().max(100).optional(),
    })
    .strip(),
};

exports.listOrdersSchema = {
  query: z.object({
    status: z.enum(Object.values(ORDER_STATUS)).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
};
