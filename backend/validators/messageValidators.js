const { z } = require("zod");
const { objectId } = require("./common");

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
  query: z.object({
    currentUserId: objectId("currentUserId"),
  }),
};
