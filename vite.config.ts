import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Enable Rolldown (available in Vite 8 Beta)
  experimental: {
    enableNativePlugin: true,
  },
  // Build configuration optimized for Rolldown
  build: {
    target: "esnext",
    minify: "esbuild", // Rolldown uses esbuild for minification
    rollupOptions: {
      // Rolldown-compatible options
      output: {
        manualChunks(id) {
          // React vendor chunk
          if (id.includes("react") || id.includes("react-dom")) {
            return "react-vendor";
          }
          // UI vendor chunk
          if (
            id.includes("@radix-ui/react-label") ||
            id.includes("@radix-ui/react-slot")
          ) {
            return "ui-vendor";
          }
          // Query vendor chunk
          if (id.includes("@tanstack/react-query")) {
            return "query-vendor";
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to Next.js API routes if needed
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  // Optimize dependencies for Rolldown
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
});
