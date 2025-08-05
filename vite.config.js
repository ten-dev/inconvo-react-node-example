import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3232,
    proxy: {
      "/api": {
        target: "http://localhost:4242",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "build",
    sourcemap: true,
  },
});
