class ErrorResponse extends Error {
  // `code` is an optional machine-readable identifier (e.g.
  // "negotiation_required") so clients can branch on the reason without
  // parsing the human message.
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    if (code) this.code = code;
  }
}

module.exports = ErrorResponse;
