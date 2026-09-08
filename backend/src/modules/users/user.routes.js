const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} = require("./user.controller");

const {
  protect,
  authorize,
  authorizeOwnerOrAdmin,
} = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { authLimiter } = require("../../middleware/rateLimit");
const { upload } = require("../../config/cloudinary");
const {
  registerSchema,
  loginSchema,
  updateUserSchema,
  userIdParamSchema,
} = require("./user.validation");

// --- Public routes (authentication) ---
// Unauthenticated and credential-bearing, so both carry the tight limiter:
// login is the brute-force target, register the account-enumeration one.
router.post("/register", authLimiter, validate(registerSchema), registerUser);
router.post("/login", authLimiter, validate(loginSchema), loginUser);

// --- User management ---
// Get all users - Admin only
router.get("/", protect, authorize("admin"), getUsers);

// Get single user - any authenticated user can view. The response is scoped
// to the caller: parties see a seller's public profile, and contact details
// (email, phone) go only to the owner or an admin. See user.service.js.
router.get("/:id", protect, validate(userIdParamSchema), getUser);

// Update user - self or admin; supports profile image upload
router.put(
  "/:id",
  protect,
  authorizeOwnerOrAdmin(),
  // multer runs before validation so multipart fields exist on req.body
  upload.single("image"),
  validate(updateUserSchema),
  updateUser
);

// Delete user - Admin only
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  validate(userIdParamSchema),
  deleteUser
);

module.exports = router;
