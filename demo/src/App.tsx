import { ChatPanel, defaultConfig } from "ai-schadcn-chat";
import type { ChatConfig } from "ai-schadcn-chat";
import type { ReactElement } from "react";

// The package's defaultConfig() reads MINIMAX_API_KEY / MINIMAX_BASE_URL /
// MINIMAX_MODEL from import.meta.env. We populate VITE_-prefixed copies in
// demo/.env (which Vite injects), and we also copy the un-prefixed names so
// the package's readEnv() helper sees them via import.meta.env.
const ENV_KEY = "MINIMAX_API_KEY";
const ENV_BASE = "MINIMAX_BASE_URL";
const ENV_MODEL = "MINIMAX_MODEL";

function envVar(name: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Demo of the ai-schadcn-chat package against the MiniMax OpenAI-compatible
 * endpoint.
 *
 *  • defaultConfig() (from the package) reads the env vars above. We populate
 *    them in demo/.env (mirrored as VITE_-prefixed copies so Vite injects
 *    them into the bundle).
 *  • We override model.id, systemPrompt, personality, and documents so the
 *    panel demonstrates the personality + document surfaces.
 *  • The header banner shows the last 6 chars of the configured key so the
 *    user can confirm in the browser that the env wiring worked.
 */
export default function App(): ReactElement {
  // Vite only injects env vars prefixed with VITE_; the package reads the
  // un-prefixed names. We bridge by reading the VITE_-prefixed copy here and
  // assigning it into import.meta.env under the un-prefixed name BEFORE we
  // call defaultConfig(). This way the package's readEnv() sees it too.
  const viteKey = envVar("VITE_MINIMAX_API_KEY");
  const viteBase = envVar("VITE_MINIMAX_BASE_URL");
  const viteModel = envVar("VITE_MINIMAX_MODEL");

  if (viteKey) (import.meta.env as Record<string, string>)[ENV_KEY] = viteKey;
  if (viteBase) (import.meta.env as Record<string, string>)[ENV_BASE] = viteBase;
  if (viteModel) (import.meta.env as Record<string, string>)[ENV_MODEL] = viteModel;

  const apiKey = envVar(ENV_KEY) ?? "";

  // Build a base config through the package's own defaultConfig() so any
  // env-reading logic it ships is exercised, then layer our overrides on top.
  const cfg: ChatConfig = defaultConfig({
    model: {
      id: envVar(ENV_MODEL) ?? "MiniMax-M3",
      label: "MiniMax M3",
      contextWindow: 128_000,
      vision: false,
      tools: true,
      maxOutput: 8_192,
      provider: "openai-compatible",
    },
    systemPrompt:
      "You are Edd's friendly coding buddy. Keep answers concise, show code in fenced blocks with the correct language tag, and admit when you don't know something.",
    personality: {
      name: "Coding buddy",
      tone: "friendly",
      locale: "en",
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
          "We are smoke-testing the ai-schadcn-chat npm package against the",
          "MiniMax OpenAI-compatible API. The expected behavior is that the",
          "panel renders, accepts a message, and streams a reply from the model.",
        ].join("\n"),
      },
    ],
    persistKey: "ai-schadcn-chat-demo",
  });

  // Hard-pin the provider credentials/base URL from the VITE_-prefixed env
  // so the demo works regardless of how the bundler resolved env names.
  if (apiKey) {
    cfg.provider = {
      ...cfg.provider,
      baseUrl: envVar(ENV_BASE) ?? cfg.provider.baseUrl,
      credentials: { ...cfg.provider.credentials, apiKey },
    };
  }

  const keyTail = apiKey ? apiKey.slice(-6) : "MISSING";
  const keyLoaded = apiKey.length > 0;

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">ai-schadcn-chat</span>
          <span>·</span>
          <span>MiniMax demo</span>
          <span>·</span>
          <span>model: {cfg.model.id}</span>
          <span>·</span>
          <span>baseUrl: {cfg.provider.baseUrl}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              keyLoaded
                ? "rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"
                : "rounded bg-destructive/15 px-2 py-0.5 text-destructive"
            }
          >
            API key: {keyLoaded ? "loaded" : "missing"}
          </span>
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-[10px]">
            …{keyTail}
          </code>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <ChatPanel config={cfg} layout="fullpage" />
      </main>
    </div>
  );
}