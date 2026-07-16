import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// `pnpm demo` runs from the package root with the config at demo/vite.config.ts.
// Vite loads this file as ESM, so we can derive the package root from the
// config file's URL (works regardless of cwd / Node module setting).
const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const demoRoot = here;

// All `ai-schadcn-chat/*` subpath imports are resolved directly to the package's
// TypeScript source tree. This way the demo consumes the local src/ files without
// requiring a build step. `cn`, shadcn CSS variables, and tailwind directives are
// provided by the demo (globals.css + tailwind.config.ts) since those are
// consumer-app concerns, not package concerns.
export default defineConfig({
  root: demoRoot,
  plugins: [react()],
  resolve: {
    // Order matters: Vite matches aliases by prefix ("foo" also matches
    // "foo/bar"), walking this object in declaration order and stopping at
    // the first hit. The bare "@edd_remonts/ai-schadcn-chat" entry must come LAST, or it
    // swallows every "@edd_remonts/ai-schadcn-chat/<subpath>" import before the specific
    // entries below ever get a chance to match.
    alias: {
      "@edd_remonts/ai-schadcn-chat/typeset.css": resolve(pkgRoot, "src/styles/typeset.css"),
      "@edd_remonts/ai-schadcn-chat/typeset-presets.css": resolve(pkgRoot, "src/styles/typeset-presets.css"),
      "@edd_remonts/ai-schadcn-chat/hooks": resolve(pkgRoot, "src/hooks/index.ts"),
      "@edd_remonts/ai-schadcn-chat/providers": resolve(pkgRoot, "src/providers/index.ts"),
      "@edd_remonts/ai-schadcn-chat/lib": resolve(pkgRoot, "src/lib/index.ts"),
      "@edd_remonts/ai-schadcn-chat/types": resolve(pkgRoot, "src/types/index.ts"),
      "@edd_remonts/ai-schadcn-chat/components": resolve(pkgRoot, "src/components/index.ts"),
      "@edd_remonts/ai-schadcn-chat": resolve(pkgRoot, "src/index.ts"),
      "@": resolve(pkgRoot, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Proxy local LLM servers so the browser talks to the same origin and
    // never hits CORS. The LM Studio provider uses baseUrl `/lmstudio/v1`,
    // which Vite forwards to the real server below (server-to-server).
    proxy: {
      "/lmstudio": {
        target: "http://127.0.0.1:1234",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/lmstudio/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
  },
  optimizeDeps: {
    // Pre-bundle the heavy package deps so first-paint isn't a waterfall of
    // dev-mode transforms for every Radix primitive.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-avatar",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "lucide-react",
      "sonner",
      "react-markdown",
      "remark-gfm",
      "rehype-highlight",
      "rehype-raw",
      "next-mdx-remote",
    ],
  },
});