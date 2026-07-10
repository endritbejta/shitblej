// Shared pagination helpers so every list endpoint parses page/limit and
// shapes next/prev links exactly the same way.

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Parse page/limit out of a raw query object (strings from Express).
// Clamps limit so a client can't request the whole collection in one call.
exports.parsePagination = (rawQuery = {}) => {
  const page = Math.max(parseInt(rawQuery.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(rawQuery.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  return { page, limit, skip: (page - 1) * limit };
};

// Build the { next, prev } links object used in the API's response envelope.
exports.buildPageLinks = ({ page, limit, skip, total, returned }) => {
  const pagination = {};
  if (skip + returned < total) pagination.next = { page: page + 1, limit };
  if (skip > 0) pagination.prev = { page: page - 1, limit };
  return pagination;
};
