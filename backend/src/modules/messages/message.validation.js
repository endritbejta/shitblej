const { z } = require("zod");
const { objectId } = require("../../shared/validators/common");

exports.sendMessageSchema = {
  body: z
    .object({
      receiver: objectId("receiver"),
      text: z.string().trim().min(1, "Please add a message text"),
      // `sender` is intentionally NOT accepted — it is always derived from the
      // authenticated user (req.user.id / socket token).
    })
    .strip(),
};

exports.conversationBetweenSchema = {
  params: z.object({ userId: objectId("userId") }),
  // `currentUserId` is no longer read — the caller comes from the JWT. A stale
  // client may still send it as a query param; it is simply ignored.
};
