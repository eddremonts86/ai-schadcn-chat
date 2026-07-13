// Paths are resolved against the demo's Vite project root, not the
// process cwd. Inside `pnpm exec vite build --config demo/vite.config.ts`
// the Vite project root is /app/demo/, so `./src/**` resolves to
// /app/demo/src/, but `src/**` (no leading dot) would resolve to the
// package source at /app/src because that's where the process happens
// to be. We expand the package source path with an absolute, glob-
// safe entry so Tailwind v3's micromatch-based content scanner finds
// the package source regardless of cwd.
const path = require("node:path");
const pkgRoot = path.resolve(__dirname, "..");

const config = {
  darkMode: ["class"],
  content: [
    // Files inside the demo itself.
    "./index.html",
    "./src/**/*.{ts,tsx}",
    // The package source that the demo imports via aliases. Without
    // this entry, every utility class used in <ChatPanel />,
    // <ChatHeader />, <Markdown />, etc. is dropped from the build
    // and the entire layout collapses to naked HTML. We list each
    // sub-tree the package source lives under, explicitly, instead of
    // one giant glob — Tailwind's default scanner does not follow
    // symlinks and may not always resolve parent-relative globs in
    // every build path (especially under Docker where `..` was
    // ambiguous in the prior iteration).
    `${pkgRoot}/src/components/**/*.{ts,tsx}`,
    `${pkgRoot}/src/hooks/**/*.{ts,tsx}`,
    `${pkgRoot}/src/lib/**/*.{ts,tsx}`,
    `${pkgRoot}/src/providers/**/*.{ts,tsx}`,
    `${pkgRoot}/src/types/**/*.{ts,tsx}`,
    `${pkgRoot}/src/utils/**/*.{ts,tsx}`,
    `${pkgRoot}/src/index.ts`,
    `${pkgRoot}/src/index.tsx`,
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        success: "oklch(var(--success) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "thinking-dot": {
          "0%, 80%, 100%": { opacity: "0.3" },
          "40%": { opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "caret-flash": {
          "0%": { opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "message-in": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "0%": { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        },
      },
      animation: {
        "thinking-dot": "thinking-dot 1.4s ease-in-out infinite both",
        "thinking-dot-2": "thinking-dot 1.4s ease-in-out infinite both 0.2s",
        "thinking-dot-3": "thinking-dot 1.4s ease-in-out infinite both 0.4s",
        "fade-in": "fade-in 200ms ease-out both",
        "slide-up": "slide-up 200ms ease-out both",
        "caret-blink": "caret-blink 1s ease-in-out infinite",
        "caret-flash": "caret-flash 700ms ease-out",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
        "message-in": "message-in 180ms ease-out both",
      },
    },
  },
  plugins: [],
};

module.exports = config;
