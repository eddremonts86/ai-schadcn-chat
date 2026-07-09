import {
  ChatPanel,
  defaultConfig,
  deleteProvider,
  listProviders,
  saveProvider,
  seedProviders,
  setActiveProviderId,
} from "ai-schadcn-chat";
import type { ChatConfig } from "ai-schadcn-chat";
import { useEffect, type ReactElement } from "react";

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
    ui: {
      title: "Coding buddy",
      // No fixed subtitle — the header shows the live model automatically.
      placeholder: "Ask anything, or paste some code…",
      greeting: "Hey Edd — what are we building?",
      suggestions: [
        "Explain async/await like I'm five",
        "Review this React component for bugs",
        "Write a SQL query with a CTE",
        "Refactor this function to be pure",
      ],
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

  // Make the env-configured MiniMax provider show up as "configured" in the
  // provider manager: seed its API key + base URL and mark it active so the
  // model switcher and manager match the live config out of the box.
  useEffect(() => {
    if (!apiKey) return;
    const mm = listProviders().find((p) => p.id === "seed:minimax");
    if (mm && !mm.apiKey) {
      saveProvider({
        ...mm,
        apiKey,
        baseUrl: envVar(ENV_BASE) ?? mm.baseUrl,
      });
      setActiveProviderId("seed:minimax");
    }
  }, [apiKey]);

  // Collapse any LM Studio duplicates (from earlier sessions) into a single
  // canonical entry pointing at the Vite proxy path (`/lmstudio/v1`) so the
  // browser stays same-origin and avoids CORS. Idempotent.
  useEffect(() => {
    const PROXIED = "/lmstudio/v1";
    const base = seedProviders().find((p) => p.id === "seed:lmstudio");
    if (!base) return;
    const lms = listProviders().filter((p) => p.name === base.name);
    const ok =
      lms.length === 1 &&
      lms[0].id === "seed:lmstudio" &&
      lms[0].baseUrl === PROXIED;
    if (ok) return;
    lms.forEach((p) => deleteProvider(p.id));
    saveProvider({ ...base, id: "seed:lmstudio", baseUrl: PROXIED });
  }, []);

  return (
    <div className="app-mesh flex h-screen w-screen flex-col overflow-hidden text-foreground">
      <main className="flex min-h-0 flex-1 justify-center p-3 sm:p-6">
        <div className="flex min-h-0 w-full max-w-5xl flex-1">
          <ChatPanel config={cfg} layout="panel" className="shadow-2xl" />
        </div>
      </main>
    </div>
  );
}