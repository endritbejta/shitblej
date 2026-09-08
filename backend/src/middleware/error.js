const ErrorResponse = require("../shared/utils/errorResponse");
const config = require("../config");
const logger = require("../shared/logger");

// Database driver errors that are NOT one of the modelled cases below
// (CastError, duplicate key, ValidationError). Their messages describe server
// internals - "$where is not allowed in this context", index names, shard
// details - so they are logged in full and reported generically.
const DB_ERROR_NAMES = ["MongoServerError", "MongoError", "MongoServerSelectionError"];

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // One structured line, carrying the request id so this can be tied back to
  // the request that produced it and to everything else logged for it. The
  // previous version drew a box of coloured console.log in development and
  // wrote only the message in production, so a production error could not be
  // traced to a caller at all.
  //
  // The level distinguishes a client's mistake from ours: a 400 is the API
  // working as designed and should not page anyone, a 500 is a defect.
  const status = err.statusCode || 500;
  const level = status >= 500 ? "error" : "warn";

  // `req.log` is the request-scoped child logger pino-http attaches; falling
  // back keeps this usable when the handler is driven directly, as the tests do.
  const log = req.log || logger;
  log[level](
    {
      err,
      status,
      // Duplicated onto the line because a log search usually starts from one
      // of these, and req serializers only run on the request-log line.
      method: req.method,
      path: req.path,
      code: err.code,
    },
    err.message || "request failed"
  );

  // Mongoose bad ObjectId (invalid ID format)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: '${err.value}'. Please provide a valid ID format.`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: '${value}' for field '${field}'. This ${field} already exists. Please use another value.`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => {
      // Provide more context for each validation error
      if (val.kind === 'required') {
        return `${val.path} is required`;
      } else if (val.kind === 'minlength') {
        return `${val.path} must be at least ${val.properties.minlength} characters`;
      } else if (val.kind === 'maxlength') {
        return `${val.path} must not exceed ${val.properties.maxlength} characters`;
      } else if (val.kind === 'min') {
        return `${val.path} must be at least ${val.properties.min}`;
      } else if (val.kind === 'max') {
        return `${val.path} must not exceed ${val.properties.max}`;
      } else if (val.kind === 'enum') {
        return `${val.path} must be one of: ${val.properties.enumValues.join(', ')}`;
      } else if (val.kind === 'regexp') {
        return `${val.path} format is invalid. ${val.message}`;
      }
      return val.message;
    });
    const message = `Validation Error: ${messages.join('. ')}`;
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new ErrorResponse(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your session has expired. Please log in again.';
    error = new ErrorResponse(message, 401);
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size is too large. Maximum size allowed is 5MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    }
    error = new ErrorResponse(message, 400);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    const message = 'Database connection failed. Please try again later.';
    error = new ErrorResponse(message, 503);
  }

  // Any other driver-level error. Without this the raw message reaches the
  // client as a 500 - which leaked internals and told a prober exactly how a
  // query was assembled. A rejected query is the caller's fault, so 400.
  if (!error.statusCode && DB_ERROR_NAMES.includes(err.name)) {
    error = new ErrorResponse("Invalid query.", 400, "invalid_query");
  }

  // Send response
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "An unexpected error occurred. Please try again.",
    ...(error.code && { code: error.code }),
    ...(config.isDev && {
      stack: err.stack,
      details: err
    })
  });
};

module.exports = errorHandler;
