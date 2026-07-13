/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Specific subpath imports MUST come before the bare "ai-schadcn-chat"
      // alias — Vite walks aliases in declaration order and the bare entry
      // would otherwise swallow every "ai-schadcn-chat/<subpath>" import.
      "ai-schadcn-chat/hooks": resolve(__dirname, "./src/hooks/index.ts"),
      "ai-schadcn-chat/providers": resolve(__dirname, "./src/providers/index.ts"),
      "ai-schadcn-chat/lib": resolve(__dirname, "./src/lib/index.ts"),
      "ai-schadcn-chat/types": resolve(__dirname, "./src/types/index.ts"),
      "ai-schadcn-chat/components": resolve(
        __dirname,
        "./src/components/index.ts",
      ),
      "ai-schadcn-chat/typeset.css": resolve(__dirname, "./src/styles/typeset.css"),
      "ai-schadcn-chat/typeset-presets.css": resolve(
        __dirname,
        "./src/styles/typeset-presets.css",
      ),
      "ai-schadcn-chat": resolve(__dirname, "./src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Only collect explicit test files — avoid treating every .ts/.tsx in
    // src/ as a test suite (which causes "No test suite found" failures).
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      "dist/**",
      "demo/**",
      "tests/e2e/**",
      "**/*.e2e.test.ts",
      "**/*.e2e.test.tsx",
    ],
    css: false,
    server: {
      deps: {
        // Make sure CJS-only deps used in tests are transformed by Vite.
        inline: [/react-markdown/, /next-mdx-remote/, /remark-gfm/],
      },
    },
  },
});