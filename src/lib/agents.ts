/**
 * Agent persistence — full CRUD for switchable assistant configurations,
 * backed by localStorage. Built-in agents are derived from the shipped
 * presets and are always present (read-only); user agents are stored under
 * `STORAGE_KEY` and are editable/deletable.
 *
 * SSR-safe: every read/write is guarded behind a `typeof window` check.
 */
import type { Agent } from "../types/chat.js";
import { defaultSystemPresets } from "../types/presets.js";
import { uid } from "./utils.js";

const STORAGE_KEY = "ai-schadcn-chat:agents";
const ACTIVE_KEY = "ai-schadcn-chat:active-agent";

/** Read-only agents that ship with the package. */
export const builtInAgents: Agent[] = [
  {
    id: "builtin:general",
    name: "General assistant",
    description: "Helpful, balanced, all-purpose.",
    icon: "✨",
    systemPrompt: defaultSystemPresets.default ?? "You are a helpful assistant.",
    tone: "friendly",
    suggestions: [
      "Explain a tricky concept simply",
      "Help me draft an email",
      "Brainstorm ideas with me",
      "Summarize a long document",
    ],
    builtIn: true,
  },
  {
    id: "builtin:coder",
    name: "Coding buddy",
    description: "Concise code help with fenced snippets.",
    icon: "💻",
    systemPrompt:
      "You are an expert pair programmer. Keep answers concise, show code in fenced blocks with the correct language tag, explain trade-offs briefly, and admit when you don't know something.",
    tone: "concise",
    suggestions: [
      "Review this function for bugs",
      "Write a SQL query with a CTE",
      "Refactor this to be pure",
      "Explain this error message",
    ],
    builtIn: true,
  },
  {
    id: "builtin:writer",
    name: "Writing editor",
    description: "Sharp, clear prose and copy editing.",
    icon: "✍️",
    systemPrompt:
      "You are a meticulous writing editor. Improve clarity, concision, and flow without changing meaning. Offer a short rationale for substantive changes.",
    tone: "professional",
    suggestions: [
      "Tighten this paragraph",
      "Make this sound more confident",
      "Proofread this for errors",
      "Rewrite this for a general audience",
    ],
    builtIn: true,
  },
];

function readUserAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Agent[];
    return Array.isArray(parsed) ? parsed.filter((a) => a && a.id) : [];
  } catch {
    return [];
  }
}

function writeUserAgents(agents: Agent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

/** All agents: built-ins first, then user agents (newest last). */
export function listAgents(): Agent[] {
  return [...builtInAgents, ...readUserAgents()];
}

export function getAgent(id: string): Agent | undefined {
  return listAgents().find((a) => a.id === id);
}

/**
 * Create or update a user agent. A missing/empty id (or a built-in id) means
 * "create" — a fresh id is minted and `builtIn` is forced off. Returns the
 * saved agent.
 */
export function saveAgent(input: Partial<Agent> & { name: string; systemPrompt: string }): Agent {
  const agents = readUserAgents();
  const isExisting =
    input.id && !input.id.startsWith("builtin:") && agents.some((a) => a.id === input.id);

  const agent: Agent = {
    id: isExisting ? input.id! : uid("agent"),
    name: input.name.trim() || "Untitled agent",
    description: input.description?.trim() || undefined,
    icon: input.icon?.trim() || "🤖",
    systemPrompt: input.systemPrompt,
    tone: input.tone,
    locale: input.locale,
    suggestions: (input.suggestions ?? []).map((s) => s.trim()).filter(Boolean),
    builtIn: false,
  };

  const next = isExisting
    ? agents.map((a) => (a.id === agent.id ? agent : a))
    : [...agents, agent];
  writeUserAgents(next);
  return agent;
}

export function deleteAgent(id: string): void {
  if (id.startsWith("builtin:")) return; // built-ins are immutable
  writeUserAgents(readUserAgents().filter((a) => a.id !== id));
}

/** Duplicate any agent (including a built-in) into an editable user copy. */
export function duplicateAgent(id: string): Agent | undefined {
  const src = getAgent(id);
  if (!src) return undefined;
  return saveAgent({
    ...src,
    id: undefined,
    name: `${src.name} copy`,
    builtIn: false,
  });
}

export function getActiveAgentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveAgentId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}
