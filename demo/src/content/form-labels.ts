/**
 * Human-readable labels for the playground form.
 *
 * Why a separate map and not a field on each ConfigField entry:
 *   - The doc grid (ConfigReference) renders the raw key on purpose so the
 *     reader can match it to code examples and to the actual config object.
 *     "credentials.apiKey" in the docs = "credentials.apiKey" in the code.
 *   - The form, by contrast, is a control surface. "API key" reads naturally;
 *     "credentials.apiKey" reads like a debugger. We need different copy in
 *     each surface even though the underlying field is the same.
 *
 * Rules applied:
 *   - Title Case, no dots.
 *   - Camel-case technical terms preserved where the alternative would feel
 *     wrong: "API key", "Top P", "MDX", "ID".
 *   - Section context baked in when a sibling has the same name:
 *     `provider.kind` → "Provider kind" (disambiguates from `model.provider`).
 *   - Boolean toggles use the imperative form that answers "what does this
 *     enable?" — "Enable voice input" instead of "enableVoiceInput".
 *
 * Each key MUST match a `path` in `config-reference.ts`. The form validates
 * this at mount via the FormLabelKey type below; if a path is missing here
 * the form falls back to a Title-Case version of the last path segment.
 */

export type FormLabelKey =
  | "provider.kind"
  | "provider.baseUrl"
  | "provider.authHeader"
  | "provider.credentials.apiKey"
  | "provider.credentials.secondaryKey"
  | "provider.credentials.secondaryKeyHeader"
  | "provider.organization"
  | "provider.project"
  | "provider.defaultHeaders"
  | "provider.chatPath"
  | "model.id"
  | "model.label"
  | "model.contextWindow"
  | "model.vision"
  | "model.tools"
  | "model.maxOutput"
  | "model.provider"
  | "model.headers"
  | "systemPrompt"
  | "documents"
  | "temperature"
  | "topP"
  | "thinking"
  | "stopSequences"
  | "maxContextTokens"
  | "retry.attempts"
  | "retry.initialDelayMs"
  | "retry.maxDelayMs"
  | "persistKey"
  | "onResponse"
  | "onError"
  | "personality.name"
  | "personality.avatar"
  | "personality.tone"
  | "personality.customTone"
  | "personality.locale"
  | "tools"
  | "ui.title"
  | "ui.subtitle"
  | "ui.placeholder"
  | "ui.greeting"
  | "ui.suggestions"
  | "ui.emptyState"
  | "ui.showModelSelector"
  | "ui.showDocumentPicker"
  | "ui.showToolCalls"
  | "ui.showTokenCount"
  | "ui.showTimestamps"
  | "ui.enableFileUpload"
  | "ui.enableVoiceInput"
  | "ui.enableMarkdown"
  | "ui.enableMdx"
  | "ui.enableCodeHighlight"
  | "ui.enableCopyButtons"
  | "ui.enableMessageActions"
  | "ui.enableConversationHistory"
  | "ui.enableRegenerate"
  | "ui.enableEdit"
  | "ui.maxFileSizeMb"
  | "ui.acceptedFileTypes"
  | "ui.theme"
  | "ui.accentColor"
  | "ui.fontFamily"
  | "ui.density"
  | "ui.layout"
  | "ui.height"
  | "ui.width"
  | "ui.position"
  | "ui.className"
  | "ui.renderMessage"
  | "ui.renderHeader"
  | "ui.renderFooter";

export const FORM_LABELS: Record<FormLabelKey, string> = {
  // Provider
  "provider.kind": "Provider kind",
  "provider.baseUrl": "Base URL",
  "provider.authHeader": "Auth header",
  "provider.credentials.apiKey": "API key",
  "provider.credentials.secondaryKey": "Secondary API key",
  "provider.credentials.secondaryKeyHeader": "Secondary key header",
  "provider.organization": "Organization",
  "provider.project": "Project",
  "provider.defaultHeaders": "Default headers",
  "provider.chatPath": "Chat path",

  // Model
  "model.id": "Model ID",
  "model.label": "Model label",
  "model.contextWindow": "Context window",
  "model.vision": "Supports vision",
  "model.tools": "Supports tools",
  "model.maxOutput": "Max output tokens",
  "model.provider": "Model provider",
  "model.headers": "Model headers",

  // Behavior
  "systemPrompt": "System prompt",
  "documents": "Context documents",
  "temperature": "Temperature",
  "topP": "Top P",
  "thinking": "Extended thinking",
  "stopSequences": "Stop sequences",
  "maxContextTokens": "Max context tokens",

  // Resilience
  "retry.attempts": "Retry attempts",
  "retry.initialDelayMs": "Retry initial delay (ms)",
  "retry.maxDelayMs": "Retry max delay (ms)",
  "persistKey": "Persist key",
  "onResponse": "On response callback",
  "onError": "On error callback",

  // Personality & tools
  "personality.name": "Personality name",
  "personality.avatar": "Personality avatar",
  "personality.tone": "Personality tone",
  "personality.customTone": "Personality custom tone",
  "personality.locale": "Personality locale",
  "tools": "Tools",

  // UI - text
  "ui.title": "Title",
  "ui.subtitle": "Subtitle",
  "ui.placeholder": "Composer placeholder",
  "ui.greeting": "Welcome greeting",
  "ui.suggestions": "Quick-start suggestions",
  "ui.emptyState": "Empty state",

  // UI - toggles
  "ui.showModelSelector": "Show model selector",
  "ui.showDocumentPicker": "Show document picker",
  "ui.showToolCalls": "Show tool calls",
  "ui.showTokenCount": "Show token count",
  "ui.showTimestamps": "Show timestamps",
  "ui.enableFileUpload": "Enable file upload",
  "ui.enableVoiceInput": "Enable voice input",
  "ui.enableMarkdown": "Enable markdown",
  "ui.enableMdx": "Enable MDX",
  "ui.enableCodeHighlight": "Enable code highlight",
  "ui.enableCopyButtons": "Enable copy buttons",
  "ui.enableMessageActions": "Enable message actions",
  "ui.enableConversationHistory": "Enable conversation history",
  "ui.enableRegenerate": "Enable regenerate",
  "ui.enableEdit": "Enable edit and resend",

  // UI - attachments
  "ui.maxFileSizeMb": "Max file size (MB)",
  "ui.acceptedFileTypes": "Accepted file types",

  // UI - theming
  "ui.theme": "Theme",
  "ui.accentColor": "Accent color",
  "ui.fontFamily": "Font family",
  "ui.density": "Density",

  // UI - layout
  "ui.layout": "Layout",
  "ui.height": "Height",
  "ui.width": "Width",
  "ui.position": "Floating position",
  "ui.className": "Outer class name",

  // UI - render slots
  "ui.renderMessage": "Render message override",
  "ui.renderHeader": "Render header override",
  "ui.renderFooter": "Render footer override",
};

/**
 * Safe lookup with fallback: returns the curated label if the path is in
 * the map, otherwise a Title-Case version of the last path segment.
 *
 * The fallback exists so adding a new ChatConfig field never breaks the
 * form — the field just shows up with a Title-Case key until someone
 * adds a curated label here.
 */
export function labelFor(path: string): string {
  if (path in FORM_LABELS) return FORM_LABELS[path as FormLabelKey];
  const segment = path.split(".").pop() ?? path;
  return segment
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}