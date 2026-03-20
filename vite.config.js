import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Ensure openai package is pre-bundled for browser correctly
  optimizeDeps: {
    include: ["openai"],
  },
  // Suppress Node built-in warnings from openai package
  resolve: {
    alias: {},
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
});
