// Core types for the ai-schadcn-chat package.
// Kept framework-agnostic (no React imports here) so they can be re-used
// in any runtime: SSR, edge, test stubs, or future worker-based providers.

export type Role = "system" | "user" | "assistant" | "tool";

export type ProviderKind =
  /** Native Anthropic Messages API (https://docs.anthropic.com) */
  | "anthropic"
  /** Native OpenAI Chat Completions API (https://platform.openai.com) */
  | "openai"
  /** Anything that speaks the OpenAI Chat Completions protocol (OpenRouter, MiniMax, Together, Groq, vLLM, Ollama /openai, etc.) */
  | "openai-compatible";

export interface ApiCredentials {
  /** Bearer token sent in the Authorization header. For MiniMax use the dedicated MINIMAX_API_KEY. */
  apiKey: string;
  /** Optional secondary key (some gateways accept x-api-key + Authorization). */
  secondaryKey?: string;
  secondaryKeyHeader?: string;
}

export interface ProviderConfig {
  kind: ProviderKind;
  /** Base URL of the API. The package appends the path itself (e.g. /v1/messages or /v1/chat/completions). */
  baseUrl: string;
  /** Defaults to Authorization: Bearer <key>. Override to use x-api-key, custom header, etc. */
  authHeader?: "bearer" | "x-api-key" | { name: string; prefix?: string };
  credentials: ApiCredentials;
  /** Optional organization / project headers. */
  organization?: string;
  project?: string;
  /** Optional default headers merged into every request. */
  defaultHeaders?: Record<string, string>;
  /** Path appended to baseUrl for chat completions. Override when proxying. */
  chatPath?: string;
}

export interface ModelDescriptor {
  /** Provider-specific model id (claude-sonnet-4-5, gpt-4o, MiniMax-M2, etc.) */
  id: string;
  /** Display label shown in the UI. Defaults to id. */
  label?: string;
  /** Context window in tokens (used by the UI to warn when the conversation gets close to the limit). */
  contextWindow?: number;
  /** True for models that can read images / pdf attachments. */
  vision?: boolean;
  /** True for models that accept tool / function calling. */
  tools?: boolean;
  /** Max tokens the model can produce in a single turn. */
  maxOutput?: number;
  /** Provider kind override. Defaults to the provider defined in ChatConfig.provider.kind. */
  provider?: ProviderKind;
  /** Extra model-specific headers (x-title etc.). */
  headers?: Record<string, string>;
}

export interface PersonalityConfig {
  /** Short name displayed in the UI (e.g. "Edd's coding buddy"). */
  name?: string;
  /** Visible avatar URL or icon name. */
  avatar?: string;
  /** Tone presets users can pick. */
  tone?:
    | "friendly"
    | "professional"
    | "casual"
    | "concise"
    | "playful"
    | "academic"
    | "sarcastic"
    | string;
  /** Free-form tone override appended to the system prompt. */
  customTone?: string;
  /** Locale for responses ("en", "es", "fr-CA", etc.). */
  locale?: string;
}

export interface PromptDocument {
  /** Unique id. */
  id: string;
  /** Display name in the docs picker. */
  name: string;
  /** Description shown as tooltip / helper text. */
  description?: string;
  /** Whether to inject this doc on every turn. */
  alwaysOn?: boolean;
  /** Markdown / plain-text body. */
  body: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool parameters. */
  parameters: Record<string, unknown>;
  /** Optional runtime handler. Returned values become the tool message. */
  handler?: (args: Record<string, unknown>, ctx: ToolCallContext) => Promise<unknown> | unknown;
}

export interface ToolCallContext {
  signal?: AbortSignal;
  conversationId?: string;
}

export interface ChatConfig {
  provider: ProviderConfig;
  model: ModelDescriptor;
  /** Master system prompt. Injected before any document. */
  systemPrompt: string;
  /** Extra context documents the model can pull from (linked as additional system messages). */
  documents?: PromptDocument[];
  personality?: PersonalityConfig;
  /** Hard cap on tokens we will feed back into the API. Older messages are dropped (sliding window). */
  maxContextTokens?: number;
  /** Sampling. */
  temperature?: number;
  topP?: number;
  /** Anthropic extended thinking. */
  thinking?: { enabled: boolean; budgetTokens?: number };
  /** Stop sequences sent to the API. */
  stopSequences?: string[];
  /** Retry policy for transient errors (429/5xx/network). */
  retry?: { attempts?: number; initialDelayMs?: number; maxDelayMs?: number };
  /** When true, persist conversations to localStorage under this key. */
  persistKey?: string | false;
  /** Customize UI text & behavior. Every field is optional; sensible defaults ship. */
  ui?: UiConfig;
  /** User-defined tools. */
  tools?: ToolDefinition[];
  /** Optional callback fired after each successful response. */
  onResponse?: (msg: ChatMessage, ctx: { conversationId: string }) => void;
  /** Optional callback fired on every error (network, parse, abort, tool). */
  onError?: (err: ChatError, ctx: { conversationId: string }) => void;
}

export interface UiConfig {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  emptyState?: ReactNodeLike;
  showModelSelector?: boolean;
  showDocumentPicker?: boolean;
  showToolCalls?: boolean;
  showTokenCount?: boolean;
  showTimestamps?: boolean;
  enableFileUpload?: boolean;
  enableVoiceInput?: boolean;
  enableMarkdown?: boolean;
  enableMdx?: boolean;
  enableCodeHighlight?: boolean;
  enableCopyButtons?: boolean;
  enableMessageActions?: boolean;
  enableConversationHistory?: boolean;
  enableRegenerate?: boolean;
  enableEdit?: boolean;
  maxFileSizeMb?: number;
  acceptedFileTypes?: string[];
  theme?: "light" | "dark" | "system";
  accentColor?: string;
  fontFamily?: string;
  density?: "compact" | "comfortable" | "spacious";
  layout?: "panel" | "floating" | "fullpage";
  height?: number | string;
  width?: number | string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
  renderMessage?: (msg: ChatMessage) => ReactNodeLike;
  renderHeader?: () => ReactNodeLike;
  renderFooter?: () => ReactNodeLike;
}

export type ReactNodeLike = unknown;

export type MessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error"
  | "aborted";

export interface AttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  /** Optional short alias for mimeType used by some components. */
  mime?: string;
  size: number;
  /** Inline base64. Use only for small files; large files should be uploaded externally and stored as URL. */
  dataUrl?: string;
  url?: string;
  /** Optional extracted text (for .txt/.md/.csv). */
  text?: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "running" | "complete" | "error";
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  /** Per-message attachments (only for user messages by default). */
  attachments?: AttachmentMeta[];
  /** Tool calls made by the assistant in this turn. */
  toolCalls?: ToolCallRecord[];
  createdAt: number;
  status: MessageStatus;
  /** Token usage reported by the API for this message (assistant only). */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Optional model id used to produce this message. */
  model?: string;
  /** Error payload when status === 'error'. */
  error?: ChatError;
  /** Optional tool-call id when role === 'tool'. */
  toolCallId?: string;
  /** Optional tool name when role === 'tool'. */
  name?: string;
}

export interface ChatError {
  code:
    | "network"
    | "aborted"
    | "rate_limit"
    | "auth"
    | "bad_request"
    | "server"
    | "parse"
    | "tool"
    | "context_overflow"
    | "unknown";
  message: string;
  status?: number;
  retryable?: boolean;
  cause?: unknown;
}

export interface ChatRequest {
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface ChatResponseChunk {
  /** Incremental text. */
  delta?: string;
  /** Tool call delta. */
  toolCall?: { id: string; name: string; arguments: string };
  /** Reason the stream finished. */
  finishReason?: "stop" | "length" | "tool_calls" | "content_filter" | "error";
  /** Final usage (anthropic emits this on the last event). */
  usage?: ChatMessage["usage"];
  /** Model used. */
  model?: string;
  /** Optional error that ended the stream. */
  error?: ChatError;
}

export interface ProviderAdapter {
  readonly kind: ProviderKind;
  stream(req: ChatRequest, cfg: ChatConfig): AsyncIterable<ChatResponseChunk>;
  abort(): void;
}