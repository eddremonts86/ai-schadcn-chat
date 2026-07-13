#!/usr/bin/env node
// scripts/postbuild.mjs
//
// Runs after `vite build` completes. Vite's library mode does NOT emit a
// package.json into `dist/` — consumers rely on the root `package.json`'s
// `exports` map to find their entry. This script makes one tiny adjustment:
//
//   1. Write `dist/package.json` with `{ "type": "module", "sideEffects":
//      ["**/*.css"] }`. This guarantees that Node's ESM loader treats every
//      file in `dist/` as ESM (matching `"type": "module"` in the root
//      package.json) and that bundlers know the only side-effectful imports
//      are the CSS file — so they tree-shake everything else cleanly.
//
//   2. The script is idempotent: if `dist/package.json` already exists with
//      the same content, the file is rewritten in place; if it doesn't
//      exist, it is created. Re-running the build never leaves stale state.
//
// Why we don't copy the full root `package.json`:
//   The root file contains `devDependencies`, `scripts`, `pnpm`, `engines`,
//   `publishConfig`, `keywords`, etc. — none of which belong on disk in a
//   published artifact. `files: ["dist", "README.md", "LICENSE"]` already
//   ensures only `dist/` is uploaded. Bundlers resolve `exports`/`main`/
//   `module`/`types` from the root package.json by walking up, so duplicating
//   them inside `dist/package.json` would be redundant at best and
//   contradictory at worst.

import { readFile, writeFile, copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "dist");
const distPkgPath = resolve(distDir, "package.json");
const distStylesPath = resolve(distDir, "styles.css");
const distTypesetPath = resolve(distDir, "typeset.css");
const distTypesetPresetsPath = resolve(distDir, "typeset-presets.css");
const distScrollerPath = resolve(distDir, "scroller.css");
const distMarkerPath = resolve(distDir, "marker.css");
const srcStylesPath = resolve(rootDir, "src/styles/typeset.css");
const srcTypesetPresetsPath = resolve(rootDir, "src/styles/typeset-presets.css");
const srcScrollerPath = resolve(rootDir, "src/styles/scroller.css");
const srcMarkerPath = resolve(rootDir, "src/styles/marker.css");

const DESIRED = {
  type: "module",
  sideEffects: ["**/*.css"],
};

async function distExists() {
  try {
    await access(distDir, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await distExists())) {
    console.error(`postbuild: dist/ not found at ${distDir} — did vite build run?`);
    process.exit(1);
  }

  let existing = null;
  try {
    const raw = await readFile(distPkgPath, "utf8");
    existing = JSON.parse(raw);
  } catch {
    existing = null;
  }

  const merged = { ...DESIRED, ...(existing ?? {}) };
  // Force our two keys to the canonical values regardless of what was there.
  merged.type = DESIRED.type;
  merged.sideEffects = DESIRED.sideEffects;

  await writeFile(distPkgPath, JSON.stringify(merged, null, 2) + "\n", "utf8");

  // Copy typeset.css + typeset-presets.css into dist/ so the package can ship
  // them via the "./typeset.css" and "./typeset-presets.css" subpath exports.
  // Vite bundles its own styles.css but these are separate vendor files we
  // ship as-is. typeset-presets.css is opt-in (only import if you want the
  // preset catalog baked in).
  try {
    await copyFile(srcStylesPath, distTypesetPath);
    console.log(`postbuild: copied ${srcStylesPath} -> ${distTypesetPath}`);
  } catch (err) {
    console.error(`postbuild: failed to copy typeset.css: ${err.message}`);
    process.exit(1);
  }
  try {
    await copyFile(srcTypesetPresetsPath, distTypesetPresetsPath);
    console.log(`postbuild: copied ${srcTypesetPresetsPath} -> ${distTypesetPresetsPath}`);
  } catch (err) {
    console.error(`postbuild: failed to copy typeset-presets.css: ${err.message}`);
    process.exit(1);
  }
  // Copy scroller.css + marker.css into dist/. The MessageScroller and
  // Marker components import these at module load, so consumers do not
  // have to wire the CSS themselves. Vendored from shadcn-rhea; see the
  // file headers for the upstream link.
  try {
    await copyFile(srcScrollerPath, distScrollerPath);
    console.log(`postbuild: copied ${srcScrollerPath} -> ${distScrollerPath}`);
  } catch (err) {
    console.error(`postbuild: failed to copy scroller.css: ${err.message}`);
    process.exit(1);
  }
  try {
    await copyFile(srcMarkerPath, distMarkerPath);
    console.log(`postbuild: copied ${srcMarkerPath} -> ${distMarkerPath}`);
  } catch (err) {
    console.error(`postbuild: failed to copy marker.css: ${err.message}`);
    process.exit(1);
  }

  console.log("postbuild: done");
  console.log(`postbuild: wrote ${distPkgPath}`);
}

main().catch((err) => {
  console.error("postbuild: failed");
  console.error(err);
  process.exit(1);
});