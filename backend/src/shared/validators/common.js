const { z } = require("zod");

// A Mongo ObjectId: 24 hex characters.
const objectId = (label = "id") =>
  z.string().regex(/^[0-9a-fA-F]{24}$/, `${label} must be a valid id`);

module.exports = { objectId };
