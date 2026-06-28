import type {
  ChatConfig,
  ModelDescriptor,
  PersonalityConfig,
} from "./chat.js";

/**
 * Built-in model presets. Add or override via `ChatConfig.model = { id: "..." }`.
 * These IDs are illustrative — verify availability for your account.
 */
export const defaultModelPresets: Record<string, ModelDescriptor> = {
  "anthropic:claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    contextWindow: 200_000,
    vision: true,
    tools: true,
    maxOutput: 8_192,
    provider: "anthropic",
  },
  "anthropic:claude-opus-4-1": {
    id: "claude-opus-4-1",
    label: "Claude Opus 4.1",
    contextWindow: 200_000,
    vision: true,
    tools: true,
    maxOutput: 8_192,
    provider: "anthropic",
  },
  "anthropic:claude-3-5-haiku-latest": {
    id: "claude-3-5-haiku-latest",
    label: "Claude 3.5 Haiku",
    contextWindow: 200_000,
    vision: false,
    tools: true,
    maxOutput: 8_192,
    provider: "anthropic",
  },
  "openai:gpt-4o": {
    id: "gpt-4o",
    label: "GPT-4o",
    contextWindow: 128_000,
    vision: true,
    tools: true,
    maxOutput: 4_096,
    provider: "openai",
  },
  "openai:gpt-4o-mini": {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    contextWindow: 128_000,
    vision: true,
    tools: true,
    maxOutput: 4_096,
    provider: "openai",
  },
  "openai:o1-preview": {
    id: "o1-preview",
    label: "o1 preview",
    contextWindow: 128_000,
    vision: false,
    tools: false,
    maxOutput: 32_768,
    provider: "openai",
  },
  "minimax:MiniMax-M2": {
    id: "MiniMax-M2",
    label: "MiniMax-M2",
    contextWindow: 128_000,
    vision: false,
    tools: true,
    maxOutput: 8_192,
    provider: "openai-compatible",
  },
  "minimax:MiniMax-M3": {
    id: "MiniMax-M3",
    label: "MiniMax-M3",
    contextWindow: 128_000,
    vision: false,
    tools: true,
    maxOutput: 8_192,
    provider: "openai-compatible",
  },
  "openrouter:anthropic/claude-sonnet-4-5": {
    id: "anthropic/claude-sonnet-4-5",
    label: "Claude Sonnet 4.5 (OpenRouter)",
    contextWindow: 200_000,
    vision: true,
    tools: true,
    maxOutput: 8_192,
    provider: "openai-compatible",
  },
};

/**
 * Built-in personalities. Override via `ChatConfig.personality`.
 */
export const defaultPersonalityPresets: Record<string, PersonalityConfig> = {
  default: { name: "Assistant", tone: "friendly", locale: "en" },
  coding: {
    name: "Coding buddy",
    tone: "concise",
    locale: "en",
    customTone:
      "You are a senior engineer. Prefer minimal, idiomatic solutions. Cite the file path and line when referencing code. Never apologize for asking clarifying questions.",
  },
  research: {
    name: "Research analyst",
    tone: "academic",
    locale: "en",
    customTone:
      "You cite sources and quantify uncertainty. You separate established facts from inference and flag both clearly.",
  },
  teacher: {
    name: "Patient teacher",
    tone: "friendly",
    locale: "en",
    customTone:
      "Explain step by step. After each explanation, ask one short check-for-understanding question.",
  },
  pirate: {
    name: "Captain Chat",
    tone: "playful",
    locale: "en",
    customTone: "Ye talk like a pirate but ye answers be accurate, aye.",
  },
};

/**
 * Built-in master system prompts.
 */
export const defaultSystemPresets: Record<string, string> = {
  default:
    "You are a helpful assistant. You answer concisely, format code with fenced blocks, and admit when you do not know.",
  strict:
    "You answer only what is asked. If the question is ambiguous, you list the disambiguating questions before answering. You never invent facts or citations.",
  json:
    "You always answer with valid JSON matching the schema the user provides. No prose outside the JSON.",
  spanish:
    "Eres un asistente útil. Respondes en español salvo que el usuario te pida otro idioma. Eres conciso, usas bloques de código con el lenguaje correcto y admites cuando no sabes algo.",
};

/**
 * Resolve a preset by key. Returns the underlying value or a passthrough.
 */
export function resolveModelPreset(
  key: string,
  fallback?: ModelDescriptor,
): ModelDescriptor {
  return defaultModelPresets[key] ?? fallback ?? { id: key };
}

export function resolvePersonalityPreset(
  key: string,
  fallback?: PersonalityConfig,
): PersonalityConfig {
  return defaultPersonalityPresets[key] ?? fallback ?? {};
}

/**
 * Default ChatConfig that talks to MiniMax via the OpenAI-compatible protocol.
 * Reads MINIMAX_API_KEY from process.env (or import.meta.env in the consumer).
 */
export function buildDefaultMiniMaxConfig(overrides: Partial<ChatConfig> = {}): ChatConfig {
  const env = readEnv();
  const config: ChatConfig = {
    provider: {
      kind: "openai-compatible",
      baseUrl: env.MINIMAX_BASE_URL || "https://api.MiniMax.chat/v1",
      authHeader: "bearer",
      credentials: {
        apiKey: env.MINIMAX_API_KEY || "",
      },
      chatPath: "/chat/completions",
    },
    model: {
      id: env.MINIMAX_MODEL || "MiniMax-M2",
      label: "MiniMax",
      contextWindow: 128_000,
      vision: false,
      tools: true,
      maxOutput: 8_192,
      provider: "openai-compatible",
    },
    systemPrompt: defaultSystemPresets.default,
    temperature: 0.7,
    retry: { attempts: 3, initialDelayMs: 800, maxDelayMs: 8_000 },
    persistKey: "ai-schadcn-chat:default",
    ui: {
      title: "Chat",
      placeholder: "Ask anything…",
      enableFileUpload: true,
      enableMarkdown: true,
      enableMdx: true,
      enableCodeHighlight: true,
      enableCopyButtons: true,
      enableMessageActions: true,
      enableConversationHistory: true,
      enableRegenerate: true,
      enableEdit: true,
      showTokenCount: true,
      showTimestamps: true,
      showDocumentPicker: true,
      maxFileSizeMb: 10,
      acceptedFileTypes: [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/json",
      ],
    },
    ...overrides,
  };
  return config;
}

function readEnv(): Record<string, string | undefined> {
  if (typeof process !== "undefined" && process.env) return process.env as Record<string, string | undefined>;
  // Vite / browser consumers expose env via import.meta.env.
  try {
    return (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
}