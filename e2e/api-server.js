const crypto = require("crypto");
const os = require("os");
const path = require("path");

// Boots the real API against a throwaway database, for Playwright to drive.
//
// This has to be a wrapper rather than a plain `npm start`, because the
// database URI does not exist until it is created: Playwright starts its
// webServer processes BEFORE globalSetup runs, so there is nowhere earlier to
// stand up an in-memory MongoDB and hand the URI over. Doing both in one
// process removes the ordering problem entirely.
//
// Nothing here is a stub. It is the same app.js, the same routes, the same
// Mongoose models and the same Socket.IO server that production runs.

const API_PORT = process.env.E2E_API_PORT || "4000";
const WEB_ORIGIN = process.env.E2E_WEB_ORIGIN || "http://127.0.0.1:4173";

const start = async () => {
  let uri = process.env.E2E_MONGO_URI;
  let memoryServer;

  if (!uri) {
    // Downloaded once and cached under ~/.cache/mongodb-binaries.
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri("shitblej_e2e");
  }

  // Set before requiring the app: config/index.js validates the environment at
  // module load and never starts if something is missing. dotenv does not
  // override variables that are already set, so a developer's backend/.env
  // cannot redirect these tests at a real database.
  Object.assign(process.env, {
    // Not "test": that switches the rate limiter to an in-memory store with
    // effectively no limit, and the point of an end-to-end run is to exercise
    // the same middleware production does. The limits are raised through the
    // documented override instead - high enough that repeated runs and
    // retries never hit them, low enough that the limiter is still in the
    // request path.
    NODE_ENV: "development",
    PORT: API_PORT,
    MONGO_URI: uri,
    CLIENT_URL: WEB_ORIGIN,
    // Generated per run, not a constant in source. A literal here would be a
    // secret-shaped string in a public repository, and a fresh one also means
    // a token minted by one run cannot be replayed against the next.
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    JWT_EXPIRE: "1h",
    TRUST_PROXY_HOPS: "0",
    RATE_LIMIT_AUTH_MAX: "10000",
    RATE_LIMIT_API_MAX: "100000",
    // Images have to go somewhere that is not a paid third-party service.
    UPLOAD_DRIVER: "local",
    UPLOAD_DIR: path.join(os.tmpdir(), "shitblej-e2e-uploads"),
    // Stored image URLs are absolute against this origin. The web app runs on
    // a different port, so a root-relative URL would resolve against the
    // static server and every image would 404 - which is how the first e2e
    // run found that the local driver was returning relative paths.
    UPLOAD_PUBLIC_BASE_URL: `http://127.0.0.1:${API_PORT}`,
    // The sweeper would otherwise fire mid-run and expire an offer a test is
    // about to act on. Its behaviour is covered in backend/tests/scheduler.
    OFFER_SWEEP_INTERVAL_MS: String(60 * 60 * 1000),
    LOG_LEVEL: process.env.LOG_LEVEL || "warn",
  });

  require(path.join(__dirname, "..", "backend", "src", "server.js"));

  const stop = async () => {
    if (memoryServer) await memoryServer.stop();
    process.exit(0);
  };
  // server.js installs its own SIGTERM/SIGINT shutdown; these run alongside it
  // so the database process is not orphaned when Playwright stops the server.
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
};

start().catch((err) => {
  console.error("e2e api-server failed to start:", err);
  process.exit(1);
});
