const api = require("./helpers/api");

// Runs in every test file's context (jest setupFilesAfterEnv), so the shared
// HTTP server is listening before the first request and closed afterwards
// without each file having to remember. See helpers/api.js for why the server
// is shared rather than created per request.
beforeAll(() => api.start());
afterAll(() => api.stop());
