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

import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "dist");
const distPkgPath = resolve(distDir, "package.json");

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
  console.log("postbuild: done");
  console.log(`postbuild: wrote ${distPkgPath}`);
}

main().catch((err) => {
  console.error("postbuild: failed");
  console.error(err);
  process.exit(1);
});