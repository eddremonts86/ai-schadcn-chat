/**
 * Authoritative, type-safe catalog of every configurable knob exposed by
 * `<ChatPanel config={...} />` and `defaultConfig(...)`. Each entry mirrors a
 * real field on `ChatConfig` / `UiConfig` / `ProviderConfig` / `ModelDescriptor`
 * in `src/types/chat.ts`. Adding a field upstream means adding a row here.
 *
 * Why a single data module (vs. JSX with prose interleaved)?
 *   - Keeps the prose next to the metadata so they cannot drift out of sync.
 *   - Renders identically for the table-of-contents, the inline filter tabs,
 *     and any future export (MDX docs, JSON schema, etc.).
 *   - Lets us iterate on the visual component without copy changes.
 */

export type ConfigSectionId =
  | "provider"
  | "model"
  | "behavior"
  | "resilience"
  | "personality-and-tools"
  | "ui";

export interface ConfigSectionMeta {
  id: ConfigSectionId;
  label: string;
  blurb: string;
}

export const CONFIG_SECTIONS: ConfigSectionMeta[] = [
  {
    id: "provider",
    label: "Provider",
    blurb: "Where requests go — protocol, base URL, auth, and credentials.",
  },
  {
    id: "model",
    label: "Model",
    blurb: "Which model to call and what it can do.",
  },
  {
    id: "behavior",
    label: "Behavior",
    blurb: "Sampling, system prompt, documents, and stop conditions.",
  },
  {
    id: "resilience",
    label: "Resilience",
    blurb: "Retries, persistence, and lifecycle callbacks.",
  },
  {
    id: "personality-and-tools",
    label: "Personality & tools",
    blurb: "Tone, locale, function calling, and custom documents.",
  },
  {
    id: "ui",
    label: "UI",
    blurb: "Text, toggles, theme, layout, and render slots.",
  },
];

export type ConfigFieldType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "literal"
  | "object"
  | "array"
  | "function"
  | "string[]"
  | "string | false"
  | "string | number";

export interface ConfigField {
  /** Path inside the ChatConfig object (dotted for nested fields). */
  path: string;
  /** Short human label. */
  name: string;
  /** TypeScript shape, rendered as a code-style chip. */
  type: ConfigFieldType;
  /** Optional enum values when type === "enum". */
  enumValues?: readonly string[];
  /** What the value defaults to when omitted. */
  defaultValue: string;
  /** Whether the field is required. */
  required: boolean;
  /** One-paragraph description of what the field controls. */
  description: string;
  /** Single TS/JS snippet demonstrating the field in use. */
  example: string;
  /** Optional extra notes / gotchas. */
  notes?: string[];
}

export const CONFIG_FIELDS: Record<ConfigSectionId, ConfigField[]> = {
  provider: [
    {
      path: "provider.kind",
      name: "kind",
      type: "enum",
      enumValues: ["anthropic", "openai", "openai-compatible"],
      defaultValue: '"openai-compatible"',
      required: true,
      description:
        "Which provider protocol the engine speaks. Native Anthropic Messages API, native OpenAI Chat Completions, or the OpenAI-compatible dialect used by OpenRouter, MiniMax, Together, Groq, vLLM, Ollama's /openai endpoint, etc.",
      example: `provider: {
  kind: "openai-compatible",
  baseUrl: "https://api.MiniMax.chat/v1",
  authHeader: "bearer",
  credentials: { apiKey: import.meta.env.VITE_MINIMAX_API_KEY },
}`,
      notes: [
        "Setting kind alone is not enough — you also need to wire baseUrl + credentials.apiKey, or every request will 401.",
      ],
    },
    {
      path: "provider.baseUrl",
      name: "baseUrl",
      type: "string",
      defaultValue: '"https://api.MiniMax.chat/v1"',
      required: true,
      description:
        "Root URL of the API. The package appends the chat-completions path itself, so do NOT include /v1/chat/completions here.",
      example: `// Local LM Studio via the demo's vite proxy
provider: {
  kind: "openai-compatible",
  baseUrl: "/lmstudio/v1",  // vite forwards this to http://127.0.0.1:1234
}`,
      notes: [
        "When pointing at a local LLM server, prefer going through your bundler's proxy so the browser stays same-origin and you avoid CORS.",
      ],
    },
    {
      path: "provider.authHeader",
      name: "authHeader",
      type: "enum",
      enumValues: ['"bearer"', '"x-api-key"', "{ name, prefix? }"],
      defaultValue: '"bearer"',
      required: false,
      description:
        "How the apiKey is sent on every request. Anthropic's native API expects x-api-key, OpenAI and most gateways expect Authorization: Bearer.",
      example: `// Anthropic native
provider: {
  kind: "anthropic",
  authHeader: "x-api-key",
  credentials: { apiKey: "sk-ant-…" },
}

// Custom header for a corporate proxy
provider: {
  kind: "openai-compatible",
  authHeader: { name: "X-Corp-Token", prefix: "Token" },
  credentials: { apiKey: "…" },
}`,
    },
    {
      path: "provider.credentials.apiKey",
      name: "credentials.apiKey",
      type: "string",
      defaultValue: '"" (read from env by defaultConfig)',
      required: true,
      description:
        "Bearer / x-api-key token sent on every request. Treat it like a password — never commit it; load it from an env var or a server-side proxy.",
      example: `const config = defaultConfig({
  provider: {
    ...defaultConfig().provider,
    credentials: { apiKey: import.meta.env.VITE_OPENAI_API_KEY },
  },
});`,
      notes: [
        "defaultConfig() reads MINIMAX_API_KEY from process.env and import.meta.env automatically; you only override this if you want a non-env source (form input, server proxy, etc.).",
      ],
    },
    {
      path: "provider.credentials.secondaryKey",
      name: "credentials.secondaryKey",
      type: "string",
      defaultValue: "undefined",
      required: false,
      description:
        "Optional secondary credential sent alongside the primary one. Some gateways accept x-api-key plus Authorization simultaneously.",
      example: `credentials: {
  apiKey: process.env.PRIMARY_KEY!,
  secondaryKey: process.env.SECONDARY_KEY,
  secondaryKeyHeader: "x-anthropic-key",
}`,
    },
    {
      path: "provider.credentials.secondaryKeyHeader",
      name: "credentials.secondaryKeyHeader",
      type: "string",
      defaultValue: '"x-api-key"',
      required: false,
      description:
        "Header name to use when sending secondaryKey. Defaults to x-api-key.",
      example: `credentials: {
  apiKey: "sk-…",
  secondaryKey: "sk-…",
  secondaryKeyHeader: "anthropic-version",
}`,
    },
    {
      path: "provider.organization",
      name: "organization",
      type: "string",
      defaultValue: "undefined",
      required: false,
      description:
        "OpenAI organization id, sent as OpenAI-Organization on every request. Ignored by non-OpenAI providers.",
      example: `provider: {
  kind: "openai",
  organization: "org_abc123",
  project: "proj_xyz",
}`,
    },
    {
      path: "provider.project",
      name: "project",
      type: "string",
      defaultValue: "undefined",
      required: false,
      description:
        "OpenAI project id, sent as OpenAI-Project. Ignored by non-OpenAI providers.",
      example: `provider: {
  kind: "openai",
  organization: "org_abc123",
  project: "proj_xyz",
}`,
    },
    {
      path: "provider.defaultHeaders",
      name: "defaultHeaders",
      type: "object",
      defaultValue: "{}",
      required: false,
      description:
        "Extra headers merged into every request. Useful for x-title, x-source, gateway identification, etc.",
      example: `provider: {
  defaultHeaders: {
    "x-title": "my-app",
    "x-source": "support-widget",
  },
}`,
    },
    {
      path: "provider.chatPath",
      name: "chatPath",
      type: "string",
      defaultValue: '"/chat/completions"',
      required: false,
      description:
        "Path appended to baseUrl for chat-completions requests. Override when proxying or hitting a non-standard gateway.",
      example: `provider: {
  baseUrl: "https://gateway.internal",
  chatPath: "/llm/v1/chat",  // non-standard gateway path
}`,
    },
  ],

  model: [
    {
      path: "model.id",
      name: "id",
      type: "string",
      defaultValue: '"MiniMax-M2"',
      required: true,
      description:
        "Provider-specific model identifier. This is what the API actually sees — typo here and you get a 404.",
      example: `model: { id: "claude-sonnet-4-5" }       // Anthropic
model: { id: "gpt-4o" }                    // OpenAI
model: { id: "anthropic/claude-sonnet-4-5" } // OpenRouter
model: { id: "llama3.1:70b" }              // Ollama /openai`,
      notes: [
        "defaultModelPresets in src/types/presets.ts ships a curated set of common ids. Use resolveModelPreset(key) to look one up by string.",
      ],
    },
    {
      path: "model.label",
      name: "label",
      type: "string",
      defaultValue: "model.id",
      required: false,
      description:
        "Display label shown in the model selector UI. Falls back to id when omitted.",
      example: `model: {
  id: "claude-sonnet-4-5",
  label: "Claude Sonnet 4.5 (production)",
}`,
    },
    {
      path: "model.contextWindow",
      name: "contextWindow",
      type: "number",
      defaultValue: "128_000",
      required: false,
      description:
        "Max input tokens the model accepts. Used by the UI to warn when the conversation approaches the limit and by the engine to truncate history (sliding window).",
      example: `model: { id: "gpt-4o", contextWindow: 128_000 }
model: { id: "claude-sonnet-4-5", contextWindow: 200_000 }`,
    },
    {
      path: "model.vision",
      name: "vision",
      type: "boolean",
      defaultValue: "false",
      required: false,
      description:
        "Whether the model can read images / pdf attachments. Drives whether the attachment picker accepts non-text files.",
      example: `model: { id: "gpt-4o", vision: true }`,
    },
    {
      path: "model.tools",
      name: "tools",
      type: "boolean",
      defaultValue: "false",
      required: false,
      description:
        "Whether the model accepts tool / function-calling. When false, config.tools is ignored even if set.",
      example: `model: { id: "gpt-4o-mini", tools: true }`,
    },
    {
      path: "model.maxOutput",
      name: "maxOutput",
      type: "number",
      defaultValue: "8_192",
      required: false,
      description:
        "Max tokens the model can produce in a single turn. Surfaced in the UI; not enforced client-side (the API decides).",
      example: `model: { id: "o1-preview", maxOutput: 32_768 }`,
    },
    {
      path: "model.provider",
      name: "provider",
      type: "enum",
      enumValues: ["anthropic", "openai", "openai-compatible"],
      defaultValue: "config.provider.kind",
      required: false,
      description:
        "Per-model provider override. Use this when one model in a config uses a different gateway than the rest (e.g. a Claude model accessed through OpenRouter).",
      example: `model: {
  id: "anthropic/claude-sonnet-4-5",
  provider: "openai-compatible",  // route via OpenRouter
}`,
    },
    {
      path: "model.headers",
      name: "headers",
      type: "object",
      defaultValue: "{}",
      required: false,
      description:
        "Model-specific headers merged on top of provider.defaultHeaders. Useful for x-title and similar.",
      example: `model: {
  id: "gpt-4o",
  headers: { "x-title": "chat-widget" },
}`,
    },
  ],

  behavior: [
    {
      path: "systemPrompt",
      name: "systemPrompt",
      type: "string",
      defaultValue: "defaultSystemPresets.default",
      required: true,
      description:
        "Master system prompt injected at the top of every request, before any document. Use this to set the assistant's overall role and rules.",
      example: `systemPrompt:
  "You are Edd's coding buddy. Keep answers concise, show code in fenced blocks with the correct language tag, and admit when you don't know something."`,
      notes: [
        "defaultSystemPresets ships with four presets: default, strict, json, spanish. Pick one with resolveSystemPreset(key).",
      ],
    },
    {
      path: "documents",
      name: "documents",
      type: "array",
      defaultValue: "[]",
      required: false,
      description:
        "Extra context documents injected as additional system messages. Always-on docs ship on every turn; the user can toggle non-alwaysOn ones via the doc picker.",
      example: `documents: [
  {
    id: "repo-style",
    name: "Repo style guide",
    description: "Conventions for this codebase.",
    alwaysOn: true,
    body: "# Conventions\\n- Prefer functional components.\\n- No default exports.",
  },
]`,
    },
    {
      path: "temperature",
      name: "temperature",
      type: "number",
      defaultValue: "0.7",
      required: false,
      description:
        "Sampling temperature. 0 = deterministic, 1 = default creative, >1 = very random. Most coding assistants want 0.2-0.4.",
      example: `temperature: 0.2,  // precise / code
temperature: 0.7,  // default
temperature: 1.2,  // brainstorm / creative writing`,
    },
    {
      path: "topP",
      name: "topP",
      type: "number",
      defaultValue: "undefined (server default)",
      required: false,
      description:
        "Nucleus sampling cutoff. Mutually exclusive in spirit with temperature; pick one. Omit to use the server default.",
      example: `temperature: 0.7,
topP: 0.9,`,
    },
    {
      path: "thinking",
      name: "thinking",
      type: "object",
      defaultValue: "undefined",
      required: false,
      description:
        "Anthropic extended thinking. When enabled, the model emits a reasoning trace before its final answer (visible in the UI via ReasoningPanel).",
      example: `thinking: {
  enabled: true,
  budgetTokens: 4096,  // max tokens spent on internal reasoning
}`,
      notes: [
        "Only honored by Anthropic. Other providers ignore the field.",
      ],
    },
    {
      path: "stopSequences",
      name: "stopSequences",
      type: "array",
      defaultValue: "undefined",
      required: false,
      description:
        "Stop sequences sent to the API. The model halts as soon as it generates any of these strings.",
      example: `stopSequences: ["</answer>", "###END###"]`,
    },
    {
      path: "maxContextTokens",
      name: "maxContextTokens",
      type: "number",
      defaultValue: "undefined (no sliding window)",
      required: false,
      description:
        "Hard cap on tokens fed back into the API. When the conversation would exceed this, oldest messages are dropped first.",
      example: `maxContextTokens: 16_000,  // keep prompts lean even if model allows more`,
    },
  ],

  resilience: [
    {
      path: "retry.attempts",
      name: "retry.attempts",
      type: "number",
      defaultValue: "3",
      required: false,
      description:
        "How many times to retry on 429 / 5xx / network errors. Total requests per turn = attempts + 1.",
      example: `retry: { attempts: 5, initialDelayMs: 500, maxDelayMs: 10_000 }`,
    },
    {
      path: "retry.initialDelayMs",
      name: "retry.initialDelayMs",
      type: "number",
      defaultValue: "800",
      required: false,
      description:
        "First retry delay in ms. Subsequent retries follow exponential backoff (initial * 2^n, capped at maxDelayMs).",
      example: `retry: { attempts: 3, initialDelayMs: 500 }`,
    },
    {
      path: "retry.maxDelayMs",
      name: "retry.maxDelayMs",
      type: "number",
      defaultValue: "8_000",
      required: false,
      description:
        "Upper bound on the per-attempt delay. The exponential curve plateaus here.",
      example: `retry: { attempts: 5, initialDelayMs: 500, maxDelayMs: 30_000 }`,
    },
    {
      path: "persistKey",
      name: "persistKey",
      type: "string | false",
      defaultValue: '"ai-schadcn-chat:default"',
      required: false,
      description:
        "When a string, conversations are saved to localStorage under this key. Set to false to disable persistence entirely (e.g. for ephemeral widgets).",
      example: `persistKey: "ai-schadcn-chat-demo:support-widget"
persistKey: false  // do not remember anything`,
      notes: [
        "Per-conversation history is keyed by the persistKey prefix — change it to isolate two panels in the same app.",
      ],
    },
    {
      path: "onResponse",
      name: "onResponse",
      type: "function",
      defaultValue: "undefined",
      required: false,
      description:
        "Fired after every successful assistant message. Receives the final ChatMessage and a context object with conversationId. Use for analytics, logging, or chaining side-effects.",
      example: `onResponse: (msg, ctx) => {
  console.log("assistant said:", msg.content);
  analytics.track("chat_response", {
    conversationId: ctx.conversationId,
    model: msg.model,
    tokens: msg.usage?.totalTokens,
  });
}`,
    },
    {
      path: "onError",
      name: "onError",
      type: "function",
      defaultValue: "undefined",
      required: false,
      description:
        "Fired on every error (network, parse, abort, tool). Receives a ChatError with code/message/status and the conversationId context.",
      example: `onError: (err, ctx) => {
  if (err.code === "rate_limit") showToast("Slow down a bit — retrying…");
  if (err.code === "auth") showToast("Invalid API key");
  console.error("chat error", err, ctx);
}`,
    },
  ],

  "personality-and-tools": [
    {
      path: "personality.name",
      name: "personality.name",
      type: "string",
      defaultValue: '"Assistant"',
      required: false,
      description:
        "Short display name shown in the header and the welcome screen.",
      example: `personality: { name: "Edd's coding buddy" }`,
    },
    {
      path: "personality.avatar",
      name: "personality.avatar",
      type: "string",
      defaultValue: "undefined (default icon)",
      required: false,
      description:
        "Avatar URL or icon name. Most consumers point this at a static /assets path.",
      example: `personality: {
  name: "Coding buddy",
  avatar: "/avatars/coding-buddy.png",
}`,
    },
    {
      path: "personality.tone",
      name: "personality.tone",
      type: "enum",
      enumValues: [
        "friendly",
        "professional",
        "casual",
        "concise",
        "playful",
        "academic",
        "sarcastic",
        "(custom string)",
      ],
      defaultValue: '"friendly"',
      required: false,
      description:
        "Tone preset appended to the system prompt. Use one of the built-ins, or pass any custom string to roll your own.",
      example: `personality: { tone: "concise" }     // concise answers
personality: { tone: "playful" }     // pirate mode
personality: { tone: "wry" }          // custom string → pass-through`,
    },
    {
      path: "personality.customTone",
      name: "personality.customTone",
      type: "string",
      defaultValue: "undefined",
      required: false,
      description:
        "Free-form tone override appended to the system prompt. Composes with tone.",
      example: `personality: {
  tone: "concise",
  customTone:
    "You are a senior engineer. Cite file paths and line numbers when referencing code.",
}`,
    },
    {
      path: "personality.locale",
      name: "personality.locale",
      type: "string",
      defaultValue: '"en"',
      required: false,
      description:
        "Locale hint for responses (en, es, fr-CA, etc.). Most LLMs honor the language they were prompted in.",
      example: `personality: { locale: "es" }`,
    },
    {
      path: "tools",
      name: "tools",
      type: "array",
      defaultValue: "[]",
      required: false,
      description:
        "User-defined tools the model can call. Each tool has a name, a description, a JSON Schema for parameters, and an async handler that returns the value the model will see.",
      example: `tools: [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
    handler: async ({ city }) => {
      const r = await fetch(\`https://wttr.in/\${city}?format=j1\`);
      return r.json();
    },
  },
]`,
      notes: [
        "Handlers receive an AbortSignal via ctx.signal — honor it for cancellation.",
        "Returned values are serialized and sent back as a tool message automatically.",
      ],
    },
  ],

  ui: [
    // Header / text
    {
      path: "ui.title",
      name: "ui.title",
      type: "string",
      defaultValue: '"Chat"',
      required: false,
      description: "Header title text.",
      example: `ui: { title: "Edd's coding buddy" }`,
    },
    {
      path: "ui.subtitle",
      name: "ui.subtitle",
      type: "string",
      defaultValue: "undefined",
      required: false,
      description: "Smaller line under the header title.",
      example: `ui: {
  title: "Support",
  subtitle: "We usually reply in a couple of minutes.",
}`,
    },
    {
      path: "ui.placeholder",
      name: "ui.placeholder",
      type: "string",
      defaultValue: '"Ask anything…"',
      required: false,
      description: "Placeholder text shown in the empty composer.",
      example: `ui: { placeholder: "How do I connect OpenAI?" }`,
    },
    {
      path: "ui.greeting",
      name: "ui.greeting",
      type: "string",
      defaultValue: '"Hello — how can I help?"',
      required: false,
      description: "Headline shown on the welcome screen above the suggestion chips.",
      example: `ui: { greeting: "Hey — what are we building?" }`,
    },
    {
      path: "ui.suggestions",
      name: "ui.suggestions",
      type: "string[]",
      defaultValue: "[]",
      required: false,
      description: "Quick-start prompt chips shown on the welcome screen.",
      example: `ui: {
  suggestions: [
    "Explain async/await like I'm five",
    "Review this React component for bugs",
  ],
}`,
    },
    {
      path: "ui.emptyState",
      name: "ui.emptyState",
      type: "literal",
      defaultValue: "undefined (built-in welcome screen)",
      required: false,
      description:
        "Custom ReactNode rendered when the conversation is empty. Overrides greeting + suggestions if provided.",
      example: `ui: {
  emptyState: <MyCustomEmptyState />,
}`,
    },
    // Toggles
    {
      path: "ui.showModelSelector",
      name: "ui.showModelSelector",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Show the model picker in the header.",
      example: `ui: { showModelSelector: false }`,
    },
    {
      path: "ui.showDocumentPicker",
      name: "ui.showDocumentPicker",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Show the per-conversation document picker.",
      example: `ui: { showDocumentPicker: false }`,
    },
    {
      path: "ui.showToolCalls",
      name: "ui.showToolCalls",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description:
        "Render tool-call traces inline in assistant messages. Turn off for a cleaner chat look.",
      example: `ui: { showToolCalls: false }`,
    },
    {
      path: "ui.showTokenCount",
      name: "ui.showTokenCount",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description:
        "Show the per-message token count footer (prompt + completion tokens reported by the API).",
      example: `ui: { showTokenCount: false }`,
    },
    {
      path: "ui.showTimestamps",
      name: "ui.showTimestamps",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Show per-message timestamps.",
      example: `ui: { showTimestamps: false }`,
    },
    {
      path: "ui.enableFileUpload",
      name: "ui.enableFileUpload",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Enable the file-upload button in the composer.",
      example: `ui: { enableFileUpload: false }`,
    },
    {
      path: "ui.enableVoiceInput",
      name: "ui.enableVoiceInput",
      type: "boolean",
      defaultValue: "false",
      required: false,
      description: "Enable the voice-input mic in the composer (browser SpeechRecognition).",
      example: `ui: { enableVoiceInput: true }`,
    },
    {
      path: "ui.enableMarkdown",
      name: "ui.enableMarkdown",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Render assistant messages through react-markdown.",
      example: `ui: { enableMarkdown: false }`,
    },
    {
      path: "ui.enableMdx",
      name: "ui.enableMdx",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Allow MDX-style components inside markdown.",
      example: `ui: { enableMdx: false }`,
    },
    {
      path: "ui.enableCodeHighlight",
      name: "ui.enableCodeHighlight",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Syntax-highlight code blocks via rehype-highlight.",
      example: `ui: { enableCodeHighlight: false }`,
    },
    {
      path: "ui.enableCopyButtons",
      name: "ui.enableCopyButtons",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Show one-click copy buttons on code blocks.",
      example: `ui: { enableCopyButtons: false }`,
    },
    {
      path: "ui.enableMessageActions",
      name: "ui.enableMessageActions",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Show the per-message hover actions (copy, regenerate, etc.).",
      example: `ui: { enableMessageActions: false }`,
    },
    {
      path: "ui.enableConversationHistory",
      name: "ui.enableConversationHistory",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Show the conversation-history menu in the header.",
      example: `ui: { enableConversationHistory: false }`,
    },
    {
      path: "ui.enableRegenerate",
      name: "ui.enableRegenerate",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Allow regenerating the last assistant message.",
      example: `ui: { enableRegenerate: false }`,
    },
    {
      path: "ui.enableEdit",
      name: "ui.enableEdit",
      type: "boolean",
      defaultValue: "true",
      required: false,
      description: "Allow editing and re-sending user messages.",
      example: `ui: { enableEdit: false }`,
    },
    // Attachments
    {
      path: "ui.maxFileSizeMb",
      name: "ui.maxFileSizeMb",
      type: "number",
      defaultValue: "10",
      required: false,
      description:
        "Hard size limit for uploads. Files larger than this are rejected client-side.",
      example: `ui: { maxFileSizeMb: 25 }`,
    },
    {
      path: "ui.acceptedFileTypes",
      name: "ui.acceptedFileTypes",
      type: "string[]",
      defaultValue: '[png, jpeg, gif, webp, pdf, txt, md, csv, json]',
      required: false,
      description:
        "Whitelist of MIME types accepted by the file picker. Vision models should add image/* and application/pdf.",
      example: `ui: {
  acceptedFileTypes: [
    "image/png", "image/jpeg", "image/webp",
    "application/pdf", "text/plain",
  ],
}`,
    },
    // Theming
    {
      path: "ui.theme",
      name: "ui.theme",
      type: "enum",
      enumValues: ['"light"', '"dark"', '"system"'],
      defaultValue: '"system"',
      required: false,
      description:
        "Theme preference. 'system' follows the OS preference; users can override via the ThemeToggle.",
      example: `ui: { theme: "dark" }`,
    },
    {
      path: "ui.accentColor",
      name: "ui.accentColor",
      type: "string",
      defaultValue: "undefined (uses --primary CSS var)",
      required: false,
      description:
        "Override the primary accent color. Accepts any CSS color value; written to --primary.",
      example: `ui: { accentColor: "#FF6B6B" }`,
    },
    {
      path: "ui.fontFamily",
      name: "ui.fontFamily",
      type: "string",
      defaultValue: "undefined (inherits)",
      required: false,
      description: "Override the chat font-family CSS variable.",
      example: `ui: { fontFamily: "'Inter', system-ui, sans-serif" }`,
    },
    {
      path: "ui.density",
      name: "ui.density",
      type: "enum",
      enumValues: ['"compact"', '"comfortable"', '"spacious"'],
      defaultValue: '"comfortable"',
      required: false,
      description: "Spacing preset — controls message padding and line-height.",
      example: `ui: { density: "compact" }`,
    },
    // Layout
    {
      path: "ui.layout",
      name: "ui.layout",
      type: "enum",
      enumValues: ['"panel"', '"floating"', '"fullpage"'],
      defaultValue: '"panel"',
      required: false,
      description:
        "Layout shell. 'panel' is a card, 'floating' is a fixed corner widget, 'fullpage' is a full-viewport pane.",
      example: `ui: { layout: "floating", position: "bottom-right" }`,
    },
    {
      path: "ui.height",
      name: "ui.height",
      type: "string | number",
      defaultValue: '"100%"',
      required: false,
      description: "Outer height — any CSS length or number (px).",
      example: `ui: { height: 600 }       // px
ui: { height: "min(80dvh, 760px)" }`,
    },
    {
      path: "ui.width",
      name: "ui.width",
      type: "string | number",
      defaultValue: '"100%"',
      required: false,
      description: "Outer width — any CSS length or number (px).",
      example: `ui: { width: "min(420px, calc(100vw - 2rem))" }`,
    },
    {
      path: "ui.position",
      name: "ui.position",
      type: "enum",
      enumValues: ['"bottom-right"', '"bottom-left"', '"top-right"', '"top-left"'],
      defaultValue: '"bottom-right"',
      required: false,
      description:
        "Only meaningful with layout='floating'. Positions the widget in the viewport corner.",
      example: `ui: { layout: "floating", position: "top-left" }`,
    },
    {
      path: "ui.className",
      name: "ui.className",
      type: "string",
      defaultValue: '""',
      required: false,
      description: "Extra className merged onto the outer container.",
      example: `ui: { className: "shadow-2xl border-primary/20" }`,
    },
    // Render slots
    {
      path: "ui.renderMessage",
      name: "ui.renderMessage",
      type: "function",
      defaultValue: "undefined",
      required: false,
      description:
        "Replace the default per-message render. Receives a ChatMessage; return whatever you want shown in its place.",
      example: `ui: {
  renderMessage: (msg) =>
    msg.role === "assistant" ? <MyBrandedBubble msg={msg} /> : null,
}`,
    },
    {
      path: "ui.renderHeader",
      name: "ui.renderHeader",
      type: "function",
      defaultValue: "undefined",
      required: false,
      description: "Replace the default header entirely.",
      example: `ui: {
  renderHeader: () => <MyCustomHeader />,
}`,
    },
    {
      path: "ui.renderFooter",
      name: "ui.renderFooter",
      type: "function",
      defaultValue: "undefined",
      required: false,
      description: "Render a custom footer slot above the composer.",
      example: `ui: {
  renderFooter: () => (
    <div className="text-xs text-muted-foreground px-4 py-2">
      Model outputs may be inaccurate — verify important info.
    </div>
  ),
}`,
    },

    // UI - Markdown typeset (shadcn/typeset)
    {
      path: "ui.typeset.enabled",
      name: "ui.typeset.enabled",
      type: "boolean",
      defaultValue: "true (when ui.typeset block is present)",
      required: false,
      description:
        "Master switch for the typeset styling system. When false (or when the ui.typeset block is absent), markdown falls back to the package's built-in `ai-prose` styles. When true, assistant messages render through [shadcn/typeset](https://ui.shadcn.com/docs/typeset) using the preset and overrides from this block.",
      example: `ui: {
  typeset: {
    enabled: true,       // default
    preset: "reading",   // serif, larger type, roomier rhythm
  },
}`,
    },
    {
      path: "ui.typeset.preset",
      name: "ui.typeset.preset",
      type: "enum",
      enumValues: ["default", "chat", "docs", "reading", "compact", "large"],
      defaultValue: '"default"',
      required: false,
      description:
        "Which typeset preset class to apply alongside the base `.typeset`. `default` is just the base container (1em / 1.75 / 1.25em). `chat` is tighter (1em / 1.6 / 1em). `reading` is serif and large. See https://ui.shadcn.com/docs/typeset for the full catalog and how to author your own preset.",
      example: `ui: {
  typeset: {
    preset: "chat",      // bubbles feel like Slack, not docs
    // preset: "reading", // serif, larger type, roomier rhythm
    // preset: "compact", // dense UI mode
  },
}`,
    },
    {
      path: "ui.typeset.size",
      name: "ui.typeset.size",
      type: "string",
      defaultValue: "preset default",
      required: false,
      description:
        "Override `--typeset-size` for this chat. Any CSS length (e.g. `15px`, `1rem`, `0.95em`). Container-aware: `1em` follows the surrounding layout's font-size, so a chat bubble inside a small UI looks smaller than a chat inside a wide docs column.",
      example: `ui: {
  typeset: {
    preset: "docs",
    size: "16px",        // bump the docs preset a bit
  },
}`,
    },
    {
      path: "ui.typeset.leading",
      name: "ui.typeset.leading",
      type: "number",
      defaultValue: "preset default",
      required: false,
      description:
        "Override `--typeset-leading` (line-height multiplier). Unitless. Higher = more breathing room between lines. The `reading` preset uses 1.9; the `chat` preset uses 1.6.",
      example: `ui: {
  typeset: {
    preset: "chat",
    leading: 1.8,        // looser chat bubbles for accessibility
  },
}`,
    },
    {
      path: "ui.typeset.flow",
      name: "ui.typeset.flow",
      type: "string",
      defaultValue: "preset default",
      required: false,
      description:
        "Override `--typeset-flow` (space between blocks). Any CSS length. The `reading` preset uses 2em; `compact` uses 1em.",
      example: `ui: {
  typeset: {
    preset: "compact",
    flow: "1.25em",      // slightly looser than the preset default
  },
}`,
    },
  ],
};

/** Total number of documented fields, useful for hero stat. */
export const TOTAL_FIELDS = Object.values(CONFIG_FIELDS).reduce(
  (acc, list) => acc + list.length,
  0,
);