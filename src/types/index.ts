export type {
  Role,
  ProviderKind,
  ApiCredentials,
  ProviderConfig,
  ModelDescriptor,
  PersonalityConfig,
  PromptDocument,
  ToolDefinition,
  ToolCallContext,
  ChatConfig,
  UiConfig,
  TypesetConfig,
  TypesetPreset,
  ReactNodeLike,
  MessageStatus,
  AttachmentMeta,
  ToolCallRecord,
  ChatMessage,
  ChatError,
  ChatRequest,
  ChatResponseChunk,
  ProviderAdapter,
} from "./chat.js";

export { defaultModelPresets, defaultPersonalityPresets, defaultSystemPresets } from "./presets.js";

import type { TypesetPreset } from "./chat.js";

/**
 * Canonical list of available typeset presets. Re-exported from the package
 * root so consumers can iterate / type-check without hardcoding the strings.
 * The CSS rules for each preset live in `ai-schadcn-chat/typeset.css`.
 */
export const TYPESET_PRESETS = [
  "default",
  "chat",
  "docs",
  "reading",
  "compact",
  "large",
] as const satisfies readonly TypesetPreset[];