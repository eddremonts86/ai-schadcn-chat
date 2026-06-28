import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        components: resolve(__dirname, "src/components/index.ts"),
        hooks: resolve(__dirname, "src/hooks/index.ts"),
        providers: resolve(__dirname, "src/providers/index.ts"),
        lib: resolve(__dirname, "src/lib/index.ts"),
        types: resolve(__dirname, "src/types/index.ts"),
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
          if (assetInfo.name === "style.css") return "style.css";
          return "assets/[name][extname]";
        },
      },
    },
    sourcemap: true,
    target: "es2022",
    cssCodeSplit: false,
  },
});