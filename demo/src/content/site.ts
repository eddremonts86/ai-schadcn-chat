/**
 * Landing-page copy, kept out of components so new sections/personas can be
 * added without touching JSX. Feature icons are referenced by name (mapped
 * to lucide-react components in FeatureGrid.tsx) so this module stays
 * framework-agnostic content, not markup.
 */
export const REPO_URL = "https://github.com/eddremonts86/ai-schadcn-chat";
export const NPM_URL = "https://www.npmjs.com/package/ai-schadcn-chat";
export const INSTALL_COMMAND = "pnpm add ai-schadcn-chat";

export interface NavLink {
  label: string;
  targetId: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Features", targetId: "features" },
  { label: "Live demo", targetId: "live-demo" },
];

export const HERO_CONTENT = {
  headline: "The AI chat panel shadcn/ui forgot to ship.",
  subheadline:
    "A fully-featured, deeply configurable chat UI for React — works with Anthropic, OpenAI, or any OpenAI-compatible gateway (OpenRouter, MiniMax, Together, Groq, vLLM, Ollama…).",
  providersLine: "Anthropic · OpenAI · OpenRouter · MiniMax · Together · Groq · vLLM · Ollama",
};

/** Rendered through the package's own <Markdown /> component in the hero —
 * same syntax-highlighting pipeline the chat messages use, so the marketing
 * page and the product share one code-rendering path. */
export const QUICK_START_SNIPPET = `\`\`\`tsx
import { ChatPanel, defaultConfig } from "ai-schadcn-chat";
import "ai-schadcn-chat/styles.css";

export function App() {
  const config = defaultConfig({
    systemPrompt: "You are a concise coding assistant.",
    ui: { title: "Coding buddy" },
  });

  return <ChatPanel config={config} />;
}
\`\`\``;

export interface FeatureItem {
  icon: "layers" | "plug" | "palette" | "wrench" | "zap" | "code";
  title: string;
  description: string;
  featured?: boolean;
}

/** The three concrete import paths behind the "Three surfaces" feature —
 * rendered as code chips inside its featured panel. */
export const THREE_SURFACES = ["<ChatPanel />", "<ChatProvider /> + <MessageList /> + <ChatComposer />", "ChatEngine"];

export const FEATURES: FeatureItem[] = [
  {
    icon: "layers",
    title: "Three surfaces, one package",
    description:
      "Drop in <ChatPanel /> for an instant UI, compose <ChatProvider /> + <MessageList /> + <ChatComposer /> for a custom layout, or use the framework-agnostic ChatEngine class without React at all.",
    featured: true,
  },
  {
    icon: "plug",
    title: "Any provider",
    description:
      "Native adapters for Anthropic and OpenAI, plus a generic OpenAI-compatible mode for OpenRouter, MiniMax, Together, Groq, vLLM, Ollama…",
  },
  {
    icon: "palette",
    title: "Built on shadcn/ui + Radix",
    description:
      "Looks and feels like the rest of the shadcn ecosystem. Your Tailwind theme carries over automatically.",
  },
  {
    icon: "wrench",
    title: "Tools / function calling",
    description:
      "Register named tools with JSON-Schema parameters and async handlers — the engine dispatches calls and feeds results back to the model.",
  },
  {
    icon: "zap",
    title: "Streaming, persistence, retries",
    description:
      "Incremental SSE streaming, automatic retry with exponential back-off for 429/5xx, opt-in localStorage persistence keyed by persistKey.",
  },
  {
    icon: "code",
    title: "Markdown, MDX, code highlighting",
    description:
      "GFM tables, raw HTML, and syntax-highlighted code with one-click copy — all through react-markdown + remark-gfm + rehype-highlight + rehype-raw.",
  },
];

/** Condensed reference injected into the support widget's always-on document. */
export const SUPPORT_WIDGET_DOC = `# ai-schadcn-chat quick reference

- Install: \`pnpm add ai-schadcn-chat\` (peer deps: react ^18.3 || ^19, react-dom same).
- Three surfaces: <ChatPanel /> (all-in-one), <ChatProvider />+<MessageList />+<ChatComposer /> (compose your own layout), or the framework-agnostic ChatEngine class.
- Providers: set config.provider.kind to "anthropic", "openai", or "openai-compatible" (OpenRouter, MiniMax, Together, Groq, vLLM, Ollama's /openai endpoint, …).
- Tools: pass config.tools with { name, description, parameters, handler } — the engine calls your handler and feeds the result back to the model.
- Theming: built on shadcn/ui + Radix; it reads your Tailwind CSS variables (--background, --primary, etc.), so your theme just carries over.
- Persistence: set config.persistKey to a string to save conversations to localStorage, or false to disable.
- Docs & source: ${REPO_URL}
`;
