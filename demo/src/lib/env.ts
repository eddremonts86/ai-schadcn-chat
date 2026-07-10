/**
 * MiniMax env wiring, isolated from App.tsx so any persona/config builder
 * can read the same credentials without re-implementing the Vite ↔
 * import.meta.env bridge.
 *
 * The package's defaultConfig() reads MINIMAX_API_KEY / MINIMAX_BASE_URL /
 * MINIMAX_MODEL from import.meta.env. Vite only injects VITE_-prefixed
 * vars, so we mirror the VITE_-prefixed copies (set in demo/.env) onto the
 * un-prefixed names before any config builder runs.
 */
export const ENV_KEY = "MINIMAX_API_KEY";
export const ENV_BASE = "MINIMAX_BASE_URL";
export const ENV_MODEL = "MINIMAX_MODEL";

const BRIDGED_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["VITE_MINIMAX_API_KEY", ENV_KEY],
  ["VITE_MINIMAX_BASE_URL", ENV_BASE],
  ["VITE_MINIMAX_MODEL", ENV_MODEL],
];

export function envVar(name: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Copies each VITE_-prefixed env var onto its un-prefixed name in
 * import.meta.env, so the package's own readEnv() helper picks it up too.
 * Safe to call more than once (idempotent).
 */
export function bridgeViteEnv(): void {
  for (const [from, to] of BRIDGED_PAIRS) {
    const value = envVar(from);
    if (value) (import.meta.env as Record<string, string>)[to] = value;
  }
}

export function minimaxApiKey(): string {
  return envVar(ENV_KEY) ?? "";
}

export function minimaxBaseUrl(): string | undefined {
  return envVar(ENV_BASE);
}

export function minimaxModel(): string | undefined {
  return envVar(ENV_MODEL);
}
