# ai-schadcn-chat

> A fully-featured, deeply configurable AI chat panel for React 18/19 — works with any Anthropic / OpenAI / OpenAI-compatible API (OpenRouter, MiniMax, Together, Groq, vLLM, Ollama, …).

[![npm version](https://img.shields.io/npm/v/@edd_remonts/ai-schadcn-chat.svg)](https://www.npmjs.com/package/@edd_remonts/ai-schadcn-chat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

## Demo

The package ships with a full interactive demo at `demo/`. Build it
locally with:

```bash
pnpm install
pnpm exec vite --config demo/vite.config.ts build
# static output → demo/dist/
```

The published `dist/` and `demo/dist/` are independent artifacts — the
package and the demo do not need each other at install time. The demo
imports `@edd_remonts/ai-schadcn-chat` from npm (see `demo/package.json`) so the
deployed demo bundle does not require the package source on the
server.

## Deployment

The demo ships as a static SPA. Two paths to get it to a host:

1. **Coolify (self-hosted PaaS on Hetzner VPS)** — `Dockerfile` and
   `docker-compose.prod.yml` at the repo root, ready to wire as a new
   Coolify application with `build_pack=dockerfile` and host
   `ai-chat.eduardoinerarte.dk`. A push to `main` triggers a rebuild
   via the Coolify GitHub webhook.
2. **Static host** (Nginx / Caddy / Cloudflare Pages / S3) — run the
   build command above, upload `demo/dist/` to the host, point
   `ai-chat.eduardoinerarte.dk` at it via wildcard DNS or a
   dedicated A record.

## Why ai-schadcn-chat

- **Three surfaces, one package** — drop in `<ChatPanel />` for an instant chat UI, compose `<ChatProvider />` + `<MessageList />` + `<ChatComposer />` for a custom layout, or use the framework-agnostic `ChatEngine` class without React at all.
- **Any provider** — native adapters for Anthropic and OpenAI, plus a generic OpenAI-compatible mode that works with OpenRouter, MiniMax, Together, Groq, vLLM, Ollama `/openai` endpoint, etc.
- **Built on shadcn/ui + Radix** — looks and feels like the rest of the shadcn ecosystem. Tailwind theming carries over.
- **Tools / function calling** — register named tools with JSON-Schema parameters and async handlers; the engine dispatches calls and feeds results back to the model.
- **Streaming, persistence, retries** — incremental SSE streaming, automatic retry with exponential back-off for 429/5xx, opt-in `localStorage` persistence keyed by `persistKey`.
- **Markdown / MDX / code highlighting** — GFM tables, raw HTML, syntax-highlighted code with one-click copy and collapse, all rendered through `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-raw`.

## Install

```bash
pnpm add @edd_remonts/ai-schadcn-chat
```

Peer deps: `react` ^18.3.0 || ^19.0.0, `react-dom` ^18.3.0 || ^19.0.0.

```bash
# if your bundler doesn't auto-install peers
pnpm add react react-dom
```

## Quick start

```tsx
import { ChatPanel, defaultConfig } from "@edd_remonts/ai-schadcn-chat";
// Import the bundled stylesheet once in your app root.
import "@edd_remonts/ai-schadcn-chat/styles.css";

export function App() {
  // defaultConfig() reads VITE_MINIMAX_API_KEY (or MINIMAX_API_KEY) from
  // both process.env and import.meta.env automatically.
  const config = defaultConfig({
    systemPrompt: "You are a concise coding assistant.",
    ui: { title: "Edd's coding buddy", placeholder: "Ask me anything…" },
  });
  return <ChatPanel config={config} />;
}
```

## Connect to MiniMax

`defaultConfig()` is pre-wired for [MiniMax](https://MiniMax.ai) via the OpenAI-compatible protocol. It reads these env vars at runtime from both `process.env` and `import.meta.env`:

| Variable            | Default                       | Purpose                                |
| ------------------- | ----------------------------- | -------------------------------------- |
| `MINIMAX_API_KEY`   | _(required)_                  | Bearer token sent on every request.    |
| `MINIMAX_BASE_URL`  | `https://api.MiniMax.chat/v1` | Override to use a proxy or gateway.    |
| `MINIMAX_MODEL`     | `MiniMax-M2`                  | Default model id surfaced in the UI.   |

Set them in a `.env` / `.env.local` file:

```bash
# .env.local
VITE_MINIMAX_API_KEY=sk-…
VITE_MINIMAX_BASE_URL=https://api.MiniMax.chat/v1
VITE_MINIMAX_MODEL=MiniMax-M2
```

In Next.js / non-Vite environments, drop the `VITE_` prefix (or expose them through your bundler of choice). The engine checks `process.env` first, then `import.meta.env`, so both runtimes work.

## Connect to OpenAI / Anthropic

Swap the `provider.kind` and supply your own API key:

```tsx
import { ChatPanel, defaultConfig } from "@edd_remonts/ai-schadcn-chat";

// OpenAI
const openai = defaultConfig({
  provider: {
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    authHeader: "bearer",
    credentials: { apiKey: import.meta.env.VITE_OPENAI_API_KEY },
    chatPath: "/chat/completions",
  },
  model: { id: "gpt-4o", label: "GPT-4o", tools: true, vision: true, contextWindow: 128_000 },
});

// Anthropic (Claude)
const claude = defaultConfig({
  provider: {
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com",
    authHeader: "x-api-key",
    credentials: {
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      secondaryKey: "2023-06-15", // sent as anthropic-version
      secondaryKeyHeader: "anthropic-version",
    },
    chatPath: "/v1/messages",
  },
  model: { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", tools: true, vision: true, contextWindow: 200_000 },
});
```

Any OpenAI-compatible gateway (OpenRouter, Together, Groq, vLLM, Ollama `/openai`, …) just needs `kind: "openai-compatible"` plus the right `baseUrl`.

## Configuration

The full `ChatConfig` shape:

```ts
import type { ChatConfig } from "@edd_remonts/ai-schadcn-chat";

const config: ChatConfig = {
  provider: { /* see "Connect to …" above */ },
  model:    { id: "MiniMax-M2", tools: true, vision: false, contextWindow: 128_000, maxOutput: 8_192 },

  systemPrompt: "You are a helpful assistant.",   // master system prompt
  documents:    [/* optional PromptDocument[] — extra context */],

  personality:  { name: "Edd's coding buddy", tone: "concise", locale: "en" },

  maxContextTokens: 120_000,    // sliding window over older messages
  temperature:      0.7,
  topP:             1,
  thinking:         { enabled: true, budgetTokens: 4_000 }, // anthropic extended thinking
  stopSequences:    ["\n\nUSER:"],

  retry:           { attempts: 3, initialDelayMs: 800, maxDelayMs: 8_000 },
  persistKey:      "ai-schadcn-chat:default",   // or `false` to disable persistence

  ui:      { /* see below */ },
  tools:   [/* see "Tools / function calling" below */],

  onResponse: (msg, ctx) => console.log("got", msg, ctx.conversationId),
  onError:    (err, ctx) => console.error(err, ctx.conversationId),
};
```

## UI overrides

Every key is optional; sensible defaults ship.

| Key                          | Type                                  | Default              |
| ---------------------------- | ------------------------------------- | -------------------- |
| `title`                      | `string`                              | `"Chat"`             |
| `subtitle`                   | `string`                              | —                    |
| `placeholder`                | `string`                              | `"Ask anything…"`    |
| `emptyState`                 | `ReactNode`                           | —                    |
| `showModelSelector`          | `boolean`                             | `true`               |
| `showDocumentPicker`         | `boolean`                             | `true`               |
| `showToolCalls`              | `boolean`                             | `true`               |
| `showTokenCount`             | `boolean`                             | `true`               |
| `showTimestamps`             | `boolean`                             | `true`               |
| `enableFileUpload`           | `boolean`                             | `true`               |
| `enableVoiceInput`           | `boolean`                             | `false`              |
| `enableMarkdown`             | `boolean`                             | `true`               |
| `enableMdx`                  | `boolean`                             | `true`               |
| `enableCodeHighlight`        | `boolean`                             | `true`               |
| `enableCopyButtons`          | `boolean`                             | `true`               |
| `enableMessageActions`       | `boolean`                             | `true`               |
| `enableConversationHistory`  | `boolean`                             | `true`               |
| `enableRegenerate`           | `boolean`                             | `true`               |
| `enableEdit`                 | `boolean`                             | `true`               |
| `maxFileSizeMb`              | `number`                              | `10`                 |
| `acceptedFileTypes`          | `string[]`                            | images + pdf + text  |
| `theme`                      | `"light" \| "dark" \| "system"`       | `"system"`           |
| `accentColor`                | `string` (CSS color)                  | —                    |
| `fontFamily`                 | `string` (CSS font-family)            | —                    |
| `density`                    | `"compact" \| "comfortable" \| "spacious"` | `"comfortable"` |
| `layout`                     | `"panel" \| "floating" \| "fullpage"` | `"panel"`            |
| `height` / `width`           | `number \| string`                    | —                    |
| `position`                   | `"bottom-right"` \| `"bottom-left"` \| `"top-right"` \| `"top-left"` | `"bottom-right"` |
| `className`                  | `string`                              | —                    |
| `renderMessage`              | `(msg: ChatMessage) => ReactNode`     | —                    |
| `renderHeader`               | `() => ReactNode`                     | —                    |
| `renderFooter`               | `() => ReactNode`                     | —                    |

## Tools / function calling

Register named tools with a JSON-Schema for `parameters` and an async `handler`. The engine dispatches tool calls made by the model and feeds the result back as a `tool` message.

```tsx
import { defaultConfig } from "@edd_remonts/ai-schadcn-chat";

const config = defaultConfig({
  tools: [
    {
      name: "get_weather",
      description: "Return the current weather for a city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name, e.g. 'Berlin'." },
          unit: { type: "string", enum: ["celsius", "fahrenheit"], default: "celsius" },
        },
        required: ["city"],
      },
      handler: async ({ city, unit }) => {
        const res = await fetch(`https://wttr.in/${city}?format=j1`);
        const data = await res.json();
        return { city, unit, temp: data.current_condition?.[0]?.temp_C };
      },
    },
  ],
});
```

## Customization

`ChatPanel` and the underlying `ChatComposer` accept render overrides:

```tsx
<ChatPanel
  config={config}
  renderHeader={() => <MyBranding />}
  renderFooter={() => <SafetyNotice />}
  renderSendButton={({ disabled, onClick }) => (
    <button onClick={onClick} disabled={disabled}>Send ➤</button>
  )}
/>
```

For a fully bespoke message renderer, use `renderMessage` (per `UiConfig`):

```tsx
<ChatPanel
  config={{
    ...config,
    ui: {
      renderMessage: (msg) => (
        msg.role === "assistant"
          ? <MyCustomBubble content={msg.content} />
          : <UserBubble content={msg.content} />
      ),
    },
  }}
/>
```

To compose your own layout without `ChatPanel`:

```tsx
import { ChatProvider, ChatHeader, MessageList, ChatComposer, useChat } from "@edd_remonts/ai-schadcn-chat";

<ChatProvider config={config}>
  <MyCustomHeader />
  <MessageList />
  <ChatComposer renderSendButton={MySendButton} />
</ChatProvider>
```

## Custom markdown / MDX components

The underlying `<Markdown />` component accepts a `components` prop that maps to `react-markdown`'s `Components` type (so you can override `a`, `pre`, `code`, `h1`, …). It is **not yet exposed through `ChatPanel`'s public surface** — today you can either:

1. Subclass `<ChatPanel />` by composing your own `<MessageList />` and rendering `<Markdown components={…} />` manually.
2. Open an issue / PR and we'll lift it into `UiConfig.renderMessage`'s signature as a first-class prop.

This is on the roadmap for the next minor release.

## Persistence

Conversations are persisted to `localStorage` automatically when `persistKey` is set (default: `"ai-schadcn-chat:default"`). Pass `persistKey: false` to disable. Switching `persistKey` at runtime switches the storage namespace — handy for multi-user or multi-tenant apps.

## Demo

The repo ships with a Vite-powered demo under `demo/`:

```bash
pnpm install
pnpm demo            # starts the demo on http://localhost:5173
# or
pnpm install && pnpm dev
```

Create `demo/.env` with your real key before launching:

```bash
# demo/.env
VITE_MINIMAX_API_KEY=sk-…
```

`demo/.env` is git-ignored.

## Build

```bash
pnpm build           # tsc → vite build → scripts/postbuild.mjs
```

Output goes to `dist/`:

- `dist/index.js` / `dist/index.cjs` — main entry
- `dist/components/` — `ChatPanel`, `MessageList`, `ChatComposer`, UI primitives
- `dist/hooks/` — `ChatProvider`, `useChat`, `useOptionalChat`, `defaultConfig`
- `dist/providers/` — Anthropic, OpenAI, OpenAI-compatible adapters
- `dist/lib/` — `ChatEngine` + helpers
- `dist/types/` — pure types (framework-agnostic)
- `dist/styles.css` — bundled Tailwind output

`scripts/postbuild.mjs` rewrites `dist/package.json` to set `"type": "module"` and `"sideEffects": ["**/*.css"]` so consumer bundlers treat the CSS side-effect correctly under both ESM and CJS resolution.

## License

[MIT](./LICENSE) © 2026 Eduardo Inerarte (eddremonts86)