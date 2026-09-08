const { defineConfig, devices } = require("@playwright/test");

const API_PORT = process.env.E2E_API_PORT || "4000";
const WEB_PORT = process.env.E2E_WEB_PORT || "4173";
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;
const WEB_ORIGIN = `http://127.0.0.1:${WEB_PORT}`;

module.exports = defineConfig({
  testDir: "./tests",
  // The money path is one long journey with two actors; it is minutes of
  // browser work, not seconds.
  timeout: 90_000,
  expect: { timeout: 10_000 },

  // Serial. These tests share one database, and a marketplace listing is
  // global state - the home page shows everyone's products. Isolating them
  // would mean a database per worker, which is not worth it for a suite this
  // size.
  workers: 1,
  fullyParallel: false,

  // A retry in CI, none locally. A flake that only shows up on a retry is
  // still worth knowing about, which is what the trace is for.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: WEB_ORIGIN,
    // Kept only for a failure, so a green run leaves nothing behind.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      // Readiness, not liveness: /health returns 200 as soon as the process is
      // up, which would let the first test run before Mongo is connected.
      // /health/ready answers 503 until the database actually responds.
      command: "node api-server.js",
      url: `${API_ORIGIN}/health/ready`,
      // The first run downloads a mongod binary.
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: { E2E_API_PORT: API_PORT, E2E_WEB_ORIGIN: WEB_ORIGIN },
    },
    {
      // The built bundle, served statically and talking to the API
      // cross-origin - the shape production actually has (Netlify to Render).
      // The dev server would proxy /api and make everything same-origin,
      // which hides both VITE_API_URL and CORS.
      command: `npm run build && npm run preview -- --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: "../shitblej-frontend-web",
      url: WEB_ORIGIN,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: { VITE_API_URL: API_ORIGIN },
    },
  ],
});
