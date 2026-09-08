// Where the API and the realtime socket live.
//
// In development both go through the Vite proxy (see vite.config.js), which
// keeps everything same-origin and sidesteps CORS. In a build they need a real
// origin, and that origin differs per environment - which is why it comes from
// VITE_API_URL rather than being written into the source. Both URLs used to be
// the literal production host in two separate files, so there was no way to
// point a build at staging without editing code.
//
// Vite only exposes vars prefixed with VITE_, and inlines them at build time.

const trimTrailingSlash = (url) => url.replace(/\/+$/, "");

// The API base, including the version prefix.
export const API_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : `${trimTrailingSlash(import.meta.env.VITE_API_URL || "")}/api/v1`;

// The socket origin. Socket.io needs an origin, not a path, so "/" in dev
// means "this origin" and lets the proxy forward the upgrade.
export const SOCKET_URL = import.meta.env.DEV
  ? "/"
  : trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "");

// A missing VITE_API_URL is caught when the build runs (see vite.config.js),
// not here: this module is evaluated before any error boundary exists, so a
// throw at this point could only turn a misconfiguration into a blank page.
