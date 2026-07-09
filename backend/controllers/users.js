const User = require("../models/User"); // Adjust the path
const ErrorResponse = require("../utils/errorResponse"); // Ensure this utility is available
const asyncHandler = require("../middleware/async"); // Ensure this middleware is available
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// --- HELPER FUNCTION (For JWT Token) ---
// Replace with your actual JWT implementation
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};
// ---------------------------------------

// userController.js (Updated)
// @desc    Register a new user
// @route   POST /api/v1/users/register
// @access  Public
exports.registerUser = asyncHandler(async (req, res, next) => {
    // Mongoose will automatically validate the password here.
    const { name, email, phone, password } = req.body;

    // 1. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        return next(new ErrorResponse("User already exists", 400));
    }

    // 2. Create the new user (Password hashing is handled by the pre-save hook)
    // The password field in req.body is the raw, unhashed password.
    const user = await User.create(req.body);

    if (user) {
        // 3. Send successful response
        res.status(201).json({
            success: true,
            token: generateToken(user._id),
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    } else {
        // This line is now unnecessary as Mongoose handles the creation/validation error
        // return next(new ErrorResponse("Invalid user data provided", 400));
    }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/v1/users/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    console.log("Login attempt for email:", email);

    // 1. Check for email and password
    if (!email || !password) {
        return next(new ErrorResponse("Please provide an email and password", 400));
    }

    // 2. Find user (must explicitly select password since 'select: false' in schema)
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new ErrorResponse("Invalid credentials", 401));
    }

    // 3. Passwords match - send token and user info
    res.status(200).json({
        success: true,
        token: generateToken(user._id),
        data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    });
});

// ----------------------------------------------------------------------
// ## CRUD Operations(Admin / Self - Management)
// ----------------------------------------------------------------------

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
    // NOTE: In a real app, pagination and filtering similar to getProducts would be here
    const users = await User.find({}).select("-password");

    if (!users.length) {
        return next(new ErrorResponse("No users found", 404));
    }

    res.status(200).json({
        success: true,
        count: users.length,
        data: users,
    });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private (Owner or Admin)
exports.getUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
        return next(
            new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
        );
    }

    // NOTE: Authorization middleware should check if req.user.id matches req.params.id or if req.user.role is 'admin'

    res.status(200).json({
        success: true,
        data: user,
    });
});

// @desc    Update user details
// @route   PUT /api/v1/users/:id
// @access  Private (Owner or Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
    // Build update object
    const updateData = {};

    // Handle regular fields from body
    if (req.body && Object.keys(req.body).length > 0) {
        // Remove password from body to prevent accidental update via this route
        if (req.body.password) {
            return next(
                new ErrorResponse("Use a dedicated route for password updates", 400)
            );
        }
        Object.assign(updateData, req.body);
    }

    // Handle uploaded image from multer/cloudinary
    if (req.file) {
        updateData.image = req.file.path; // Cloudinary URL
    }

    // Check if there's any data to update
    if (Object.keys(updateData).length === 0) {
        return next(new ErrorResponse("No data provided for update", 400));
    }

    // Find the user and update
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
        select: "-password", // Ensure password isn't returned
    });

    if (!user) {
        return next(
            new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: user,
    });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
        return next(
            new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: {}, // Return an empty object or null for a successful delete
        message: "User deleted successfully",
    });
});