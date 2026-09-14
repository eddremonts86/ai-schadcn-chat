#!/usr/bin/env node
// scripts/verify-dist.mjs
//
// Fails the build when `dist/` does not contain what the package promises.
//
// 0.2.0 shipped with every CSS subpath in `exports` missing and with two
// emitted modules importing stylesheets that were not in the tarball, so any
// bundler resolving them failed outright. Nothing caught it: `npm publish`
// runs `prepare` AFTER `prepublishOnly`, and `prepare` re-ran `vite build`
// (which empties dist/) without the postbuild copy step.
//
// Two checks, run against the real artifact:
//   1. Every path named in `exports` exists on disk.
//   2. Every bare `import "….css"` inside dist/ resolves to a real file.

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function collectExportPaths(exportsField, out = []) {
  if (typeof exportsField === "string") {
    if (exportsField.startsWith("./")) out.push(exportsField);
    return out;
  }
  if (exportsField && typeof exportsField === "object") {
    for (const value of Object.values(exportsField)) collectExportPaths(value, out);
  }
  return out;
}

async function main() {
  const pkg = JSON.parse(await readFile(resolve(rootDir, "package.json"), "utf8"));
  const problems = [];

  const declared = new Set([
    ...collectExportPaths(pkg.exports ?? {}),
    ...[pkg.main, pkg.module, pkg.types].filter(Boolean),
  ]);

  for (const rel of declared) {
    if (!(await exists(resolve(rootDir, rel)))) {
      problems.push(`package.json declares ${rel}, which does not exist`);
    }
  }

  const cssImport = /(?:^|[\s;])(?:import|@import)\s+["']([^"']+\.css)["']/gm;
  for await (const file of walk(distDir)) {
    if (!/\.(js|cjs|mjs|css)$/.test(file)) continue;
    const source = await readFile(file, "utf8");
    for (const [, specifier] of source.matchAll(cssImport)) {
      if (!specifier.startsWith(".")) continue; // bare specifiers resolve via node_modules
      if (!(await exists(resolve(dirname(file), specifier)))) {
        problems.push(
          `${file.slice(rootDir.length + 1)} imports "${specifier}", which does not exist`,
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error(`verify-dist: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ✖ ${problem}`);
    console.error("\nverify-dist: dist/ does not match what package.json promises.");
    process.exit(1);
  }

  console.log(`verify-dist: ok — ${declared.size} declared paths, every CSS import resolves`);
}

main().catch((err) => {
  console.error("verify-dist: failed");
  console.error(err);
  process.exit(1);
});
