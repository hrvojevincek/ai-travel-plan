import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // `server-only` throws when imported outside a React Server Component
      // (Next.js marker package). Vitest's environment isn't RSC, so we stub
      // it to a no-op for tests. The runtime guard still applies in prod.
      "server-only": new URL(
        "./src/test/server-only-shim.ts",
        import.meta.url
      ).pathname,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 15_000,
  },
});
