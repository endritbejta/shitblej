const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Check if header exists
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    // 2. Check if token was found
    if (!token) {
        console.log("❌ Auth Failed: No token found in Authorization header");
        return next(new ErrorResponse("Not authorized to access this route", 401));
    }

    try {
        // 3. Verify token
        // Make sure JWT_SECRET matches what was used to sign the token!
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token Verified. User ID:", decoded.id);

        // 4. Find user
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            console.log("❌ Auth Failed: User not found in database with ID:", decoded.id);
            return next(new ErrorResponse("Not authorized to access this route", 401));
        }

        next();
    } catch (err) {
        // 5. Catch verification errors
        console.error("❌ Auth Error:", err.message);
        return next(new ErrorResponse("Not authorized to access this route", 401));
    }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};