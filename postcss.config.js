export default {
  plugins: {
    // No tailwindcss here. The stylesheets this package ships are plain CSS —
    // no @tailwind, no @apply, no @layer — and the utility classes in the
    // components' className strings are compiled by the consumer's own
    // Tailwind, which is how a shadcn-style library is meant to work. Running
    // Tailwind here changed nothing in the output and coupled the package to a
    // Tailwind major: the v3 -> v4 plugin move broke this build outright.
    // The demo keeps its own postcss.config.js + tailwind.config.cjs.
    autoprefixer: {},
  },
};
