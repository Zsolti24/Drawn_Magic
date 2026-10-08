import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  server: {
    host: true,
    // A tunnel (cloudflared / ngrok) véletlenszerű domainről érkezik
    allowedHosts: true,
    // A WebSocket ugyanazon a porton megy, így egyetlen tunnel elég
    proxy: {
      "/ws": { target: "ws://localhost:3001", ws: true },
    },
  },
});
