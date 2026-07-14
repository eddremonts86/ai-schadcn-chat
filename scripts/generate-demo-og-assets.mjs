// Generates raster SEO/PWA assets for demo/public from a single source of
// truth (demo/public/icon.svg) plus an inline OG-card template, using the
// Chromium build already installed for Playwright e2e tests (no new
// dependency). Re-run whenever the brand gradient or OG copy changes:
//
//   node scripts/generate-demo-og-assets.mjs
//
// Outputs (all under demo/public/, all served at the site root by Vite):
//   favicon-32.png, favicon-192.png, favicon-512.png, apple-touch-icon.png
//   og-image.png (1200x630, standard OG/Twitter card size)
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../demo/public");
const iconSvg = readFileSync(resolve(publicDir, "icon.svg"), "utf8");

const ICON_SIZES = [
  { file: "favicon-32.png", size: 32 },
  { file: "favicon-192.png", size: 192 },
  { file: "favicon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function iconHtml(size) {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    html,body{margin:0;padding:0;background:transparent;}
    svg{display:block;width:${size}px;height:${size}px;}
  </style></head><body>${iconSvg}</body></html>`;
}

function ogHtml() {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    html,body{margin:0;padding:0;}
    body{
      width:${OG_WIDTH}px;height:${OG_HEIGHT}px;
      display:flex;flex-direction:column;justify-content:center;
      padding:0 96px;box-sizing:border-box;
      background:radial-gradient(120% 140% at 8% 0%, #7c3aed 0%, #4c1d95 45%, #1e1033 100%);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;
      color:#f5f3ff;
    }
    .brand{display:flex;align-items:center;gap:16px;margin-bottom:40px;}
    .brand svg{width:56px;height:56px;}
    .brand span{font-size:30px;font-weight:600;letter-spacing:-0.02em;}
    h1{font-size:60px;line-height:1.08;font-weight:700;letter-spacing:-0.03em;margin:0 0 24px;max-width:920px;}
    p{font-size:28px;line-height:1.4;color:#e4d9ff;margin:0 0 32px;max-width:880px;}
    .pill{display:inline-flex;align-self:flex-start;font-size:22px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
      background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.22);border-radius:999px;
      padding:10px 24px;color:#f5f3ff;}
  </style></head><body>
    <div class="brand">${iconSvg}<span>ai-schadcn-chat</span></div>
    <h1>The AI chat panel shadcn/ui forgot to ship.</h1>
    <p>A fully-featured, deeply configurable chat UI for React — Anthropic, OpenAI, or any OpenAI-compatible gateway.</p>
    <span class="pill">pnpm add ai-schadcn-chat</span>
  </body></html>`;
}

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();

    for (const { file, size } of ICON_SIZES) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(iconHtml(size));
      const buffer = await page.screenshot({ omitBackground: true });
      writeFileSync(resolve(publicDir, file), buffer);
      console.log(`wrote demo/public/${file} (${size}x${size})`);
    }

    await page.setViewportSize({ width: OG_WIDTH, height: OG_HEIGHT });
    await page.setContent(ogHtml());
    const ogBuffer = await page.screenshot();
    writeFileSync(resolve(publicDir, "og-image.png"), ogBuffer);
    console.log(`wrote demo/public/og-image.png (${OG_WIDTH}x${OG_HEIGHT})`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
