import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The Go server in Docker answers /api, so the browser never needs CORS.
  server: { proxy: { "/api": "http://localhost:8081" } },
});
