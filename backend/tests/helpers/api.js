const http = require("http");
const app = require("../../src/app");

// ONE listening HTTP server per test file, shared by every supertest call in it.
//
// Why this exists: supertest, when handed an Express app (a function), builds
// a fresh server for EVERY request -
//
//   if (typeof app === 'function') app = http.createServer(app);
//   ...
//   if (!addr) this._server = app.listen(0);   // lib/test.js
//
// - and closes it again once the response lands. This suite makes well over a
// thousand requests per run, so that was a thousand listen/close cycles, each
// taking and releasing an ephemeral port while client sockets sat in
// TIME_WAIT on those same ports. Reusing a port under a lingering socket is
// how a request ends up reading a response that was not its own, which is
// what the suite's rare, unexplainable failures looked like: a 404 from a
// route that exists, a 405, an empty body, a row that was definitely written
// coming back missing - landing on a different test each run.
//
// Handing supertest a server that is ALREADY listening skips both halves:
// `app.address()` is non-null, so it neither listens nor closes, and every
// request in the file goes to this one port.

const server = http.createServer(app);

// Registered globally for every test file by tests/setupServer.js, so
// individual tests do not have to manage the lifecycle.
exports.start = () =>
  new Promise((resolve, reject) => {
    if (server.listening) return resolve(server);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

exports.stop = () =>
  new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });

// Pass this to supertest: `request(api)` rather than `request(app)`.
exports.server = server;
