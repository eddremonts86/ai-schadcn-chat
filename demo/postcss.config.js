export default {
  plugins: {
    // The `tailwindcss` plugin must be explicit about which config to
    // use. Without this hint it walks up from /app/demo looking for
    // the closest tailwind.config.{js,cjs,mjs,ts}. Inside the Docker
    // build the workspace layout (postinstall scripts, /app/src
    // siblings) occasionally causes it to land on a stale path;
    // pointing at demo/tailwind.config.cjs explicitly removes that
    // ambiguity.
    tailwindcss: { config: "./demo/tailwind.config.cjs" },
    autoprefixer: {},
  },
};
