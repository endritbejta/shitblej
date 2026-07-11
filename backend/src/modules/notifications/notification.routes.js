const express = require("express");
const router = express.Router();
const { z } = require("zod");
const {
  listNotifications,
  markRead,
  markAllRead,
} = require("./notification.controller");
const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { objectId } = require("../../shared/validators/common");

router.use(protect);

// @route   GET /api/v1/notifications?unread=true
router.get(
  "/",
  validate({
    query: z.object({
      unread: z.enum(["true", "false"]).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  }),
  listNotifications
);

// Declared before "/:id/read" so "read-all" is not captured as an id.
// @route   PATCH /api/v1/notifications/read-all
router.patch("/read-all", markAllRead);

// @route   PATCH /api/v1/notifications/:id/read
router.patch(
  "/:id/read",
  validate({ params: z.object({ id: objectId("notification id") }) }),
  markRead
);

module.exports = router;
