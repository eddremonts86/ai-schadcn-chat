import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        components: resolve(import.meta.dirname, "src/components/index.ts"),
        hooks: resolve(import.meta.dirname, "src/hooks/index.ts"),
        providers: resolve(import.meta.dirname, "src/providers/index.ts"),
        lib: resolve(import.meta.dirname, "src/lib/index.ts"),
        types: resolve(import.meta.dirname, "src/types/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        /^@radix-ui\//,
        /^@tanstack\//,
        "lucide-react",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        "tailwindcss-animate",
        "react-markdown",
        "remark-gfm",
        "rehype-highlight",
        "rehype-raw",
        "next-mdx-remote",
        "sonner",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
        },
        assetFileNames: (assetInfo) => {
          // Vite 5 called the bundled stylesheet style.css; Vite 8 names it
          // after the package. cssCodeSplit is false, so there is exactly one
          // — pin it to the name exports["./styles.css"] and the README
          // promise, whatever the bundler decides to call it.
          const name = assetInfo.names?.[0] ?? assetInfo.name ?? "";
          if (name.endsWith(".css")) return "styles.css";
          return "assets/[name][extname]";
        },
      },
    },
    sourcemap: true,
    target: "es2022",
    cssCodeSplit: false,
  },
});