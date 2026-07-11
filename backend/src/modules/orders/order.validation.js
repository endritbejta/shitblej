const { z } = require("zod");
const { objectId } = require("../../shared/validators/common");
const { ORDER_STATUS } = require("./order.constants");

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

// Checkout is deliberately lightweight: the agreement (offer) fixes the
// product and the price; the buyer supplies only delivery details.
// Amounts are intentionally NOT accepted - pricing is server-side only.
exports.checkoutSchema = {
  body: z
    .object({
      offer: objectId("offer"),
      shippingAddress,
      note,
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
