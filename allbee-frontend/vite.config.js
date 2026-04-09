import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // ── Proxy /api/chat to backend during LOCAL dev ──────────────
  // On Vercel (production) the api/chat.js serverless function
  // handles it automatically — no proxy needed.
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
