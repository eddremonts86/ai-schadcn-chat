import type {
  ChatConfig,
  ChatRequest,
  ChatResponseChunk,
  ProviderAdapter,
} from "../types/chat.js";
import { errorChunk, normalizePrompt } from "./base.js";

/**
 * Chrome built-in on-device model adapter (Prompt API / Gemini Nano).
 *
 * Runs entirely inside Chrome 138+ via the global `LanguageModel` — no network,
 * no API key. Intended as a key-less fallback so a public demo/prod can be tried
 * without exposing anyone's credentials.
 *
 * Availability is gated by browser, hardware, and a one-time model download; the
 * adapter surfaces an actionable error chunk when the model can't run rather than
 * throwing, so the chat UI can show guidance.
 *
 * No function-calling or vision on-device, so tool-calls and attachments are ignored.
 */

export type ChromeAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable";

interface LanguageModelSession {
  promptStreaming(input: string, opts?: { signal?: AbortSignal }): AsyncIterable<string>;
  destroy(): void;
}

interface LanguageModelCreateOptions {
  initialPrompts?: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  monitor?: (m: {
    addEventListener(type: "downloadprogress", listener: (e: { loaded: number }) => void): void;
  }) => void;
}

interface LanguageModelStatic {
  availability(): Promise<ChromeAvailability>;
  create(opts?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

function getLanguageModel(): LanguageModelStatic | undefined {
  return (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

/**
 * Reports whether the Chrome built-in model can run. Returns `"unavailable"`
 * when the API is absent (non-Chrome, too old, or flag off) so callers can
 * branch on a single value.
 */
export async function chromeAiAvailability(): Promise<ChromeAvailability> {
  const lm = getLanguageModel();
  if (!lm) return "unavailable";
  try {
    return await lm.availability();
  } catch {
    return "unavailable";
  }
}

const UNAVAILABLE_MESSAGE =
  "Chrome's built-in AI is unavailable. It requires Chrome 138+ on supported hardware with the " +
  "Prompt API enabled (chrome://flags/#prompt-api-for-gemini-nano) and the on-device model downloaded. " +
  "Switch to a configured provider with an API key to continue.";

export class ChromeAIProvider implements ProviderAdapter {
  public readonly kind = "chrome-builtin" as const;

  private controller: AbortController | null = null;

  public abort(): void {
    this.controller?.abort();
    this.controller = null;
  }

  public async *stream(req: ChatRequest, cfg: ChatConfig): AsyncIterable<ChatResponseChunk> {
    const lm = getLanguageModel();
    if (!lm) {
      yield errorChunk({ code: "bad_request", message: UNAVAILABLE_MESSAGE, retryable: false });
      return;
    }

    const availability = await chromeAiAvailability();
    if (availability === "unavailable") {
      yield errorChunk({ code: "bad_request", message: UNAVAILABLE_MESSAGE, retryable: false });
      return;
    }

    if (availability === "downloadable" || availability === "downloading") {
      yield { delta: "\u0000think:Downloading the on-device model (first run only)…" };
    }

    const prompt = normalizePrompt(cfg, req.messages);
    const initialPrompts: LanguageModelCreateOptions["initialPrompts"] = [];
    if (prompt.system) initialPrompts.push({ role: "system", content: prompt.system });

    const turns = prompt.messages.filter((m) => m.role === "user" || m.role === "assistant");
    const lastUser = [...turns].reverse().find((m) => m.role === "user");
    for (const m of turns) {
      if (m === lastUser) continue;
      initialPrompts.push({ role: m.role as "user" | "assistant", content: m.content });
    }

    const controller = new AbortController();
    this.controller = controller;
    const signal = combineSignals(controller.signal, req.signal);

    let session: LanguageModelSession | undefined;
    try {
      session = await lm.create({
        initialPrompts,
        ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
        signal,
        monitor(m) {
          m.addEventListener("downloadprogress", () => {});
        },
      });

      const input = lastUser?.content ?? "";
      for await (const chunk of session.promptStreaming(input, { signal })) {
        if (chunk) yield { delta: chunk };
      }
      yield { finishReason: "stop", model: "gemini-nano" };
    } catch (err) {
      if (signal.aborted) return;
      yield errorChunk(err);
    } finally {
      session?.destroy();
      if (this.controller === controller) this.controller = null;
    }
  }
}

function combineSignals(a: AbortSignal, b?: AbortSignal): AbortSignal {
  if (!b) return a;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (a.aborted || b.aborted) controller.abort();
  else {
    a.addEventListener("abort", onAbort, { once: true });
    b.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}
