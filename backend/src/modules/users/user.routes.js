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
const { upload } = require("../../config/cloudinary");
const {
  registerSchema,
  loginSchema,
  updateUserSchema,
  userIdParamSchema,
} = require("./user.validation");

// --- Public routes (authentication) ---
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);

// --- User management ---
// Get all users - Admin only
router.get("/", protect, authorize("admin"), getUsers);

// Get single user - any authenticated user can view
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
