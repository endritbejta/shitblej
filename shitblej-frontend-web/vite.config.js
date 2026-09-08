import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the backend to avoid CORS.
// Defaults to the hosted backend so the frontend works standalone (products,
// etc.); set API_PROXY_TARGET=http://localhost:3000 for full-stack work
// (running the local backend — needed for the Saved Items / wishlist API).
//
// This target only applies to `npm run dev`. A production build talks to
// VITE_API_URL directly — see src/lib/config.js and .env.example.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_PROXY_TARGET || "https://shitblej.onrender.com";

  // Fail the BUILD, not the user's browser. VITE_API_URL is inlined at build
  // time, so a build without it produces an artifact that can only issue
  // requests to relative paths - which resolve against the static host and
  // come back as confusing 404s. Better for CI (and Netlify) to stop here.
  if (command === "build" && !env.VITE_API_URL) {
    throw new Error(
      "VITE_API_URL is required for a production build (for example " +
        "https://shitblej.onrender.com). See .env.example."
    );
  }

  return {
    plugins: [react()],

    test: {
      // jsdom, because a couple of the units under test touch window: the API
      // client dispatches a DOM event on 401 and the token store reads
      // localStorage.
      environment: "jsdom",
      include: ["src/**/*.test.{js,jsx}"],
      restoreMocks: true,
    },

    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: !target.includes("localhost"),
        },
        // Realtime (socket.io) rides the same backend.
        "/socket.io": {
          target,
          changeOrigin: true,
          secure: !target.includes("localhost"),
          ws: true,
        },
      },
    },
  };
});
