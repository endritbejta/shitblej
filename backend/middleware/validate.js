const ErrorResponse = require("../utils/errorResponse");

// Request-validation middleware factory.
//
// Usage:
//   validate({ body: schema, params: schema, query: schema })
//
// Each source is optional. On failure it forwards a single 400 ErrorResponse
// with all field messages, matching the API's existing error envelope.
//
// NOTE: In Express 5 `req.query` is a read-only getter, so we validate query
// and params without reassigning them; only `req.body` is replaced with the
// parsed (coerced, stripped) result.
const validate = (schemas = {}) => (req, res, next) => {
  const issues = [];

  for (const source of ["body", "params", "query"]) {
    const schema = schemas[source];
    if (!schema) continue;

    // Express 5 leaves req.body undefined when no parser matched the
    // content-type; treat that as an empty object so optional-only schemas
    // don't fail with a confusing "expected object" error.
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        issues.push(path ? `${path}: ${issue.message}` : issue.message);
      }
    } else if (source === "body") {
      req.body = result.data;
    }
  }

  if (issues.length > 0) {
    return next(
      new ErrorResponse(`Validation Error: ${issues.join(". ")}`, 400)
    );
  }

  next();
};

module.exports = validate;
