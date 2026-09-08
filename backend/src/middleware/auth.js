const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../shared/utils/errorResponse");
const User = require("../modules/users/user.model");
const config = require("../config");

// Protect routes: require a valid Bearer token and load the user onto req.
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new ErrorResponse("Not authorized to access this route", 401));
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return next(new ErrorResponse("Not authorized to access this route", 401));
        }

        next();
    } catch {
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

// Allow the action only when the authenticated user targets their own
// resource (req.params[idParam] matches their id) or is an admin.
exports.authorizeOwnerOrAdmin = (idParam = "id") => {
    return (req, res, next) => {
        if (req.user.id === req.params[idParam] || req.user.role === "admin") {
            return next();
        }
        return next(
            new ErrorResponse("Not authorized to perform this action", 403)
        );
    };
};
