// Side-effect imports of stylesheets. TypeScript's Bundler module
// resolution treats files without an extension as code modules, so a
// plain `import "./foo.css"` raises TS2307. The shim below tells the
// compiler that any `*.css` import is allowed and is a side-effect
// (no exported members). Used by the package's components to load the
// vendor stylesheets at module load time without forcing consumers to
// wire each one manually.
declare module "*.css";
