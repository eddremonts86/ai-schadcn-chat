// CommonJS form: the package root declares "type": "module", but
// tailwind's loader compiles `tailwind.config.js` via its own
// require() bridge, which expects CommonJS exports. We keep the
// `module.exports` form here and silence the ESLint warning about it.
const config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    // Pull the package's source through Tailwind so utility classes used by
    // ChatPanel/ChatComposer/MessageBubble/etc. get generated too.
    "../src/**/*.{ts,tsx}",
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

// eslint-disable-next-line no-undef
module.exports = config;

console.error("TAILWIND-CONFIG-LOADED content=" + JSON.stringify(config.content));
