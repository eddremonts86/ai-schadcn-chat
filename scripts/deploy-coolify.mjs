#!/usr/bin/env node
/**
 * scripts/deploy-coolify.mjs
 *
 * One-shot deploy script for the ai-schadcn-chat demo to conductor-01
 * via Coolify's REST API. Runs idempotently — safe to re-run; if the
 * application already exists this just re-triggers a deployment.
 *
 * Reads config from env vars in this order:
 *   1. .env (project root) — sourced at start
 *   2. process.env — overrides .env
 *
 * Required env vars:
 *   COOLIFY_API_URL    e.g. http://178.105.106.79:8000
 *   COOLIFY_API_TOKEN  bearer token
 *   COOLIFY_PROJECT_UUID
 *   COOLIFY_SERVER_UUID
 *   COOLIFY_APP_UUID   (existing app, or omit + supply --name to create new)
 *   HETZNER_USER       ssh user with write access to /data/coolify
 *   HETZNER_SERVER_NAME conductor-01
 *   COOLIFY_GITHUB_DEPLOY_KEY_UUID
 *   COOLIFY_DB_UUID     (unused but logged for context)
 *
 * Usage:
 *   node scripts/deploy-coolify.mjs                       # deploy existing app
 *   node scripts/deploy-coolify.mjs --create-app         # create + deploy
 *   node scripts/deploy-coolify.mjs --app-name ai-chat    # custom name (default: ai-chat)
 *   node scripts/deploy-coolify.mjs --dry-run             # show what would happen
 *
 * Exit codes:
 *   0  success (deploy triggered, or already deployed)
 *   1  invalid env / connection error
 *   2  Coolify rejected the request (4xx/5xx)
 *   3  deployment did not reach a "running" state within timeout
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolvePath(__dirname, "..");

// ── tiny .env loader (avoids needing dotenv as a dependency) ────────────────
function loadDotenv() {
  const envPath = resolvePath(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, k, v] = m;
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv();

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  if (!v || v.startsWith("--")) return true;
  return v;
};

const DRY_RUN = flag("dry-run");
const CREATE_APP = flag("create-app");
const APP_NAME = arg("app-name", "ai-chat");
const DOMAIN = "ai-chat.eduardoinerarte.dk";

const REQUIRED = [
  "COOLIFY_API_URL",
  "COOLIFY_API_TOKEN",
  "COOLIFY_PROJECT_UUID",
  "COOLIFY_SERVER_UUID",
];
for (const k of REQUIRED) {
  if (!process.env[k]) {
    console.error(`error: missing required env var ${k}`);
    process.exit(1);
  }
}

const API = process.env.COOLIFY_API_URL.replace(/\/+$/, "");
const TOKEN = process.env.COOLIFY_API_TOKEN;
const PROJECT = process.env.COOLIFY_PROJECT_UUID;
const SERVER = process.env.COOLIFY_SERVER_UUID;
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const log = (...a) => console.log(`[coolify-deploy]`, ...a);

async function api(method, path, body) {
  if (DRY_RUN) {
    log(`DRY RUN ${method} ${API}${path}`,
        body ? `body=${JSON.stringify(body).slice(0, 200)}` : "");
    return { dry_run: true };
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) {
    console.error(`error: ${method} ${path} -> ${res.status}\n${text}`);
    process.exit(2);
  }
  return payload;
}

async function findAppByName(name) {
  // Coolify v4 returns applications flat under /api/v1/applications
  // (each carries its project_uuid). When the caller supplies
  // COOLIFY_PROJECT_UUID we filter to that project so we never pick up
  // an app from a different project by name coincidence.
  const list = (await api("GET", `/api/v1/applications`)) || [];
  if (!Array.isArray(list)) return null;
  return list.find(
    (a) =>
      (a.name === name || a.fqdn?.includes(DOMAIN)) &&
      (PROJECT ? a.project_uuid === PROJECT : true),
  );
}

async function ensureApp() {
  if (process.env.COOLIFY_APP_UUID) {
    log(`using existing app uuid=${process.env.COOLIFY_APP_UUID}`);
    return { uuid: process.env.COOLIFY_APP_UUID };
  }
  const existing = await findAppByName(APP_NAME);
  if (existing) {
    log(`found existing app uuid=${existing.uuid}`);
    return existing;
  }
  if (!CREATE_APP) {
    console.error(
      `error: no app uuid provided and no app named "${APP_NAME}" found.\n` +
      `       re-run with --create-app to register one, or set COOLIFY_APP_UUID.`,
    );
    process.exit(1);
  }
  log(`creating application "${APP_NAME}" on ${DOMAIN}`);
  // Field names verified against the live Coolify v4.0.0 API schema
  // (app/Http/Controllers/Api/ApplicationsController.php on this instance):
  // "dockerfile_path" and bare "fqdn" are NOT accepted fields — the real
  // fields are "dockerfile_location" (path within the repo) and "domains"
  // (a full "https://..." URL, not a bare hostname). "environment_name" is
  // also required (or environment_uuid) and isn't optional despite not
  // being flagged by earlier validation errors (extra-field checks short
  // circuit before the environment presence check runs).
  const created = await api(
    "POST",
    `/api/v1/applications/public?project_uuid=${PROJECT}&server_uuid=${SERVER}`,
    {
      type: "dockerfile",
      name: APP_NAME,
      description: "Static SPA demo for the ai-schadcn-chat npm package",
      environment_name: "production",
      git_repository: "https://github.com/eddremonts86/ai-schadcn-chat.git",
      git_branch: "main",
      build_pack: "dockerfile",
      dockerfile_location: "/Dockerfile",
      ports_exposes: "80",
      destination_uuid: SERVER,
      domains: `https://${DOMAIN}`,
    },
  );
  return created;
}

async function triggerDeploy(appUuid) {
  log(`triggering deploy for ${appUuid}`);
  // The generic "/applications/{uuid}/deploy" path does not exist on this
  // Coolify v4.0.0 instance (404) — the real endpoint is "start" (GET or
  // POST both accepted per the live ApplicationsController source).
  await api("POST", `/api/v1/applications/${appUuid}/start`);
  log("deploy request accepted; polling for a running state");
  for (let i = 0; i < 30; i++) {
    const status = await api("GET", `/api/v1/applications/${appUuid}`);
    if (status?.status === "running:healthy" || status?.status === "running") {
      log(`deployment reached running state after ~${i + 1} polls`);
      return status;
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  console.error("error: deployment did not reach running state within 150s");
  process.exit(3);
}

log(`Coolify host: ${API}`);
log(`Project UUID: ${PROJECT}`);
log(`Server UUID:  ${SERVER}`);
log(`Target:       https://${DOMAIN}/`);
if (DRY_RUN) log("DRY RUN — no side effects");

const app = await ensureApp();
log(`app: ${app.uuid}`);
await triggerDeploy(app.uuid);

log(`done. visit https://${DOMAIN}/ in a moment.`);
