import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge tailwind classes with conflict resolution. Wraps clsx + tailwind-merge
 * so consumers don't have to remember to call both.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Lightweight ID generator. Uses crypto.randomUUID when available; otherwise
 * falls back to a timestamp + random suffix that's collision-safe for in-tab use.
 */
export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Sleep for `ms` milliseconds. Used by retry logic.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Estimate token count using the OpenAI rule of thumb (~4 chars/token).
 * Good enough for sliding-window heuristics; not a replacement for
 * the provider's own tokenizer.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Truncate a string to at most `maxTokens` worth of content (using the same
 * 4-char-per-token rule). Used by the auto-summarize fallback when the
 * conversation overflows the model's context window.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[…truncated…]`;
}

/**
 * Read a File as a base64 data URL. Used to inline images for vision-capable
 * models and to preview non-text attachments in the UI.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Read a File as plain text. Used for .md/.txt/.csv/.json attachments so the
 * assistant can quote them verbatim.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Format a byte count as a human-readable string.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${units[i]}`;
}

/**
 * Format a unix timestamp (ms) for the chat UI.
 */
export function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Type guard for `unknown` -> Error.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error("Unknown error");
  }
}

/**
 * Safe JSON parse with a fallback.
 */
export function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Deep-merge two ChatConfig-shaped objects. Source overrides target,
 * arrays are replaced (not concatenated), nested objects are recursed.
 * Used by presets / `ChatProvider config={…} > defaultConfig` precedence.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T> | undefined,
): T {
  if (!source) return target;
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * Trim a conversation so it fits inside `maxTokens`.
 * Strategy: drop the oldest non-system messages until under the cap.
 * System messages (master prompt + documents) are always kept.
 */
export function trimMessagesByTokens<T extends { role: string; content: string }>(
  messages: T[],
  maxTokens: number,
): T[] {
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  let used = system.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const kept: T[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const m = rest[i];
    const cost = estimateTokens(m.content);
    if (used + cost > maxTokens) break;
    kept.unshift(m);
    used += cost;
  }
  return [...system, ...kept];
}