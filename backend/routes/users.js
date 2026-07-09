// userRoutes.js
const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUsers, // Fetches all users
    getUser,    // Fetches single user
    updateUser,
    deleteUser,
} = require("../controllers/users");

const { protect, authorize } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

// Middleware to check if user is updating themselves or is admin
const authorizeUserUpdate = (req, res, next) => {
    // Allow if user is updating their own profile OR is an admin
    if (req.user.id === req.params.id || req.user.role === 'admin') {
        next();
    } else {
        const ErrorResponse = require("../utils/errorResponse");
        return next(new ErrorResponse("Not authorized to update this user", 403));
    }
};

// --- Public Routes (Authentication) ---
router.post("/register", registerUser);
router.post("/login", loginUser);

// --- User Management Routes ---
// Get all users - Admin only
router.get("/", protect, authorize("admin"), getUsers);

// Get single user - Any authenticated user can view
router.get("/:id", protect, getUser);

// Update user - User can update themselves OR admin can update anyone
// Supports single image upload for profile picture
router.put("/:id", protect, authorizeUserUpdate, upload.single('image'), updateUser);

// Delete user - Admin only
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;