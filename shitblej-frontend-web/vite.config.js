import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the backend to avoid CORS.
// Defaults to the local backend for full-stack development; override with
// API_PROXY_TARGET (e.g. the hosted URL) to run the frontend on its own.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_PROXY_TARGET || "http://localhost:3000";

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
      },
    },
  };
});
