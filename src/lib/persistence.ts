import type { ChatMessage } from "../types/chat.js";

const STORAGE_PREFIX = "ai-schadcn-chat:conversation:";

/**
 * Per-conversation persistence using `localStorage` by default.
 * The package intentionally avoids a hard dep on Indexeddb — the
 * persisted payload is small (messages + metadata) and localStorage
 * is available in every React 18/19 environment we target.
 *
 * For SSR safety, all reads/writes are guarded behind a typeof window check.
 */
export interface PersistedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  config?: { model?: string; temperature?: number };
}

export function loadConversation(id: string): PersistedConversation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedConversation;
    if (!parsed?.messages) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConversation(conv: PersistedConversation): void {
  if (typeof window === "undefined") return;
  try {
    // Strip tool-call `result` payloads that may contain Functions or DOM nodes —
    // they're not JSON-serializable and would crash the save.
    const safeMessages = conv.messages.map((m) => ({
      ...m,
      toolCalls: (m.toolCalls ?? []).map((tc) => ({
        ...tc,
        result: tc.result instanceof Object ? safeClone(tc.result) : tc.result,
      })),
    }));
    window.localStorage.setItem(
      STORAGE_PREFIX + conv.id,
      JSON.stringify({ ...conv, messages: safeMessages }),
    );
  } catch {
    // quota / privacy mode — silently skip; the chat still works in memory.
  }
}

export function listConversations(): PersistedConversation[] {
  if (typeof window === "undefined") return [];
  const out: PersistedConversation[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as PersistedConversation;
      if (parsed?.id) out.push(parsed);
    } catch {
      // skip corrupted entries
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteConversation(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + id);
  } catch {
    // ignore
  }
}

export function clearAllConversations(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function safeClone(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

/**
 * Trim persisted messages to a sane size to prevent runaway storage use.
 * 1000 messages × ~5KB each = 5MB, well within localStorage limits.
 */
export function trimPersisted(conv: PersistedConversation, max = 1000): PersistedConversation {
  if (conv.messages.length <= max) return conv;
  return {
    ...conv,
    messages: conv.messages.slice(-max),
  };
}