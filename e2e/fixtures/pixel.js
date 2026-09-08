// A real 1x1 PNG, as bytes. Kept as base64 in source rather than a binary file
// so the fixture is reviewable and cannot be quietly swapped.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

module.exports = { PNG };
