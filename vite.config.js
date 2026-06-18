import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4173"
    }
  },
  build: {
    outDir: "public/dist",
    emptyOutDir: true
  }
});
