const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} = require("../controllers/users");

const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { upload } = require("../config/cloudinary");
const ErrorResponse = require("../utils/errorResponse");
const {
  registerSchema,
  loginSchema,
  updateUserSchema,
  userIdParamSchema,
} = require("../validators/userValidators");

// Allow the action if the user targets their own profile OR is an admin.
// (Phase 2 will relocate this into middleware/auth.js as a reusable
// authorizeOwnerOrAdmin.)
const authorizeUserUpdate = (req, res, next) => {
  if (req.user.id === req.params.id || req.user.role === "admin") {
    return next();
  }
  return next(new ErrorResponse("Not authorized to update this user", 403));
};

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
  authorizeUserUpdate,
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
