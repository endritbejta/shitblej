const { z } = require("zod");
const { objectId } = require("../../shared/validators/common");

exports.addSavedItemSchema = {
  body: z
    .object({
      product: objectId("product"),
      // `user` is intentionally NOT accepted — ownership is always bound to
      // the authenticated user in the service.
    })
    .strip(),
};

exports.savedItemIdParamSchema = {
  params: z.object({ id: objectId("saved item id") }),
};

exports.savedItemProductParamSchema = {
  params: z.object({ productId: objectId("product id") }),
};
