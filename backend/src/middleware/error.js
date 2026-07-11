const ErrorResponse = require("../shared/utils/errorResponse");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log detailed error for developers (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'.red);
    console.log('ERROR DETAILS:'.red.bold);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'.red);
    console.log('Name:'.yellow, err.name);
    console.log('Message:'.yellow, err.message);
    console.log('Status Code:'.yellow, err.statusCode || 500);
    console.log('Path:'.yellow, req.path);
    console.log('Method:'.yellow, req.method);
    if (err.stack) {
      console.log('Stack Trace:'.yellow);
      console.log(err.stack.gray);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'.red);
  } else if (process.env.NODE_ENV !== 'test') {
    // Production: just log the error message. Silent in tests to keep
    // jest output readable (expected 4xx errors would spam the console).
    console.log(`Error: ${err.message}`.red);
  }

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

  // Send response
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "An unexpected error occurred. Please try again.",
    ...(error.code && { code: error.code }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
};

module.exports = errorHandler;
