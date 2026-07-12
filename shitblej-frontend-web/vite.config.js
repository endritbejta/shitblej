import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the backend to avoid CORS.
// Defaults to the hosted backend so the frontend works standalone (products,
// etc.); set API_PROXY_TARGET=http://localhost:3000 for full-stack work
// (running the local backend — needed for the Saved Items / wishlist API).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_PROXY_TARGET || "https://shitblej.onrender.com";

  return {
    plugins: [react()],
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
