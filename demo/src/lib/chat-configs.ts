import { buildDefaultChromeConfig, defaultConfig } from "ai-schadcn-chat";
import type { ChatConfig, ModelDescriptor } from "ai-schadcn-chat";
import { bridgeViteEnv, minimaxApiKey, minimaxBaseUrl, minimaxModel } from "./env";
import { SUPPORT_WIDGET_DOC } from "../content/site";

// Run once at module load, before any config builder below reads env vars.
bridgeViteEnv();

/** True when this build has no MiniMax key, so the demo runs key-less. */
export function usingChromeFallback(): boolean {
  return !minimaxApiKey();
}

/**
 * Point a persona config at a live provider. With a MiniMax key it uses the
 * shared MiniMax deployment; without one (e.g. the public demo) it falls back
 * to Chrome's built-in on-device model so the chat works with no credentials.
 * Only the provider/model swap — the persona's prompt, UI, and documents stay.
 */
function withProvider(config: ChatConfig): ChatConfig {
  const apiKey = minimaxApiKey();
  if (!apiKey) {
    const chrome = buildDefaultChromeConfig();
    return { ...config, provider: chrome.provider, model: chrome.model };
  }
  return {
    ...config,
    provider: {
      ...config.provider,
      baseUrl: minimaxBaseUrl() ?? config.provider.baseUrl,
      credentials: { ...config.provider.credentials, apiKey },
    },
  };
}

function baseModel(): ModelDescriptor {
  return {
    id: minimaxModel() ?? "MiniMax-M3",
    label: "MiniMax M3",
    contextWindow: 128_000,
    vision: false,
    tools: true,
    maxOutput: 8_192,
    provider: "openai-compatible",
  };
}

/** The "Coding buddy" persona embedded live in the demo's #live-demo section. */
export function buildCodingBuddyConfig(): ChatConfig {
  const config = defaultConfig({
    model: baseModel(),
    systemPrompt:
      "You are Edd's friendly coding buddy. Keep answers concise, show code in fenced blocks with the correct language tag, and admit when you don't know something.",
    personality: { name: "Coding buddy", tone: "friendly", locale: "en" },
    ui: {
      title: "Coding buddy",
      placeholder: "Ask anything, or paste some code…",
      greeting: "Hey — what are we building?",
      suggestions: [
        "Explain async/await like I'm five",
        "Review this React component for bugs",
        "Write a SQL query with a CTE",
        "Refactor this function to be pure",
      ],
      // Match the catalog's documented defaults so the playground form
      // reflects the same initial state as a fresh chat consumer would get.
      // Without these, every boolean is `undefined` and the switches show
      // "off" even though they are documented as default-on.
      showModelSelector: true,
      showDocumentPicker: true,
      showToolCalls: true,
      enableConversationHistory: true,
      enableFileUpload: true,
      enableMarkdown: true,
      enableCodeHighlight: true,
      enableCopyButtons: true,
      enableMessageActions: true,
      enableRegenerate: true,
      enableEditAndResend: true,
      // enableVoiceInput defaults to false — microphone is opt-in to avoid
      // prompting for permissions the user never asked for.
      enableVoiceInput: false,
      // enableMdx is off by default; consumers can flip it on if they need
      // MDX rendering, but plain markdown covers the common case.
      enableMdx: false,
    },
    documents: [
      {
        id: "demo-doc",
        name: "Demo project notes",
        description: "Tiny bit of context so the model knows what we're building.",
        alwaysOn: true,
        body: [
          "# Demo project",
          "",
          "This panel is embedded live on the ai-schadcn-chat landing page to",
          "smoke-test the npm package against the MiniMax OpenAI-compatible API.",
          "The expected behavior is that it renders, accepts a message, and",
          "streams a reply from the model.",
        ].join("\n"),
      },
    ],
    persistKey: "ai-schadcn-chat-demo:coding-buddy",
  });
  return withProvider(config);
}

/** The "Docs guide" persona behind the floating support widget. */
export function buildSupportWidgetConfig(): ChatConfig {
  const config = defaultConfig({
    model: baseModel(),
    systemPrompt:
      "You are the on-site guide for the ai-schadcn-chat npm package's demo site. " +
      "Answer questions about installing the package, wiring up providers " +
      "(Anthropic / OpenAI / any OpenAI-compatible gateway), the three " +
      "surfaces (ChatPanel, ChatProvider/MessageList/ChatComposer, or the " +
      "framework-agnostic ChatEngine), tools/function calling, streaming, " +
      "persistence, and theming. Be concise. If you don't know, say so and " +
      "point to the GitHub repo instead of guessing.",
    personality: { name: "Docs guide", tone: "friendly", locale: "en" },
    ui: {
      title: "Ask about this library",
      placeholder: "How do I connect OpenAI?",
      greeting: "Questions about ai-schadcn-chat?",
      suggestions: [
        "How do I connect Anthropic or OpenAI?",
        "How does tool / function calling work?",
        "What's the difference between the three surfaces?",
        "How do I theme it with my own colors?",
      ],
    },
    documents: [
      {
        id: "readme-summary",
        name: "README summary",
        description: "Condensed reference so answers stay accurate.",
        alwaysOn: true,
        body: SUPPORT_WIDGET_DOC,
      },
    ],
    persistKey: "ai-schadcn-chat-demo:support-widget",
  });
  return withProvider(config);
}
