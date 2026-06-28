import type {
  ChatConfig,
  ChatError,
  ChatMessage,
  ChatRequest,
  ChatResponseChunk,
  ProviderAdapter,
  Role,
} from "../types/chat.js";
import { sleep, toError, uid } from "../lib/utils.js";

/**
 * Base class shared by all streaming adapters.
 *
 * Handles:
 * - request construction (URL, headers, body)
 * - retry with exponential backoff for transient errors
 * - AbortSignal propagation
 * - streaming via fetch + ReadableStream parsing
 *
 * Subclasses only need to implement `formatRequest` and `parseChunk`.
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  public abstract readonly kind: ProviderAdapter["kind"];

  protected currentController: AbortController | null = null;

  public abort(): void {
    this.currentController?.abort();
    this.currentController = null;
  }

  public async *stream(req: ChatRequest, cfg: ChatConfig): AsyncIterable<ChatResponseChunk> {
    const attempt = async (): Promise<AsyncGenerator<ChatResponseChunk, void>> => {
      const controller = new AbortController();
      this.currentController = controller;
      const signal = combineSignals(controller.signal, req.signal);

      const { url, headers, body } = this.buildRequest(req, cfg);

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers,
          body,
          signal,
        });
      } catch (err) {
        if (signal.aborted) throw toAbortError();
        throw toNetworkError(err);
      }

      if (!response.ok) {
        const errorBody = await safeReadErrorBody(response);
        throw toHttpError(response.status, errorBody);
      }

      if (!response.body) {
        throw toParseError("Empty response body from provider");
      }

      return this.parseStream(response.body, signal);
    };

    const maxAttempts = Math.max(1, cfg.retry?.attempts ?? 1);
    const initialDelay = cfg.retry?.initialDelayMs ?? 800;
    const maxDelay = cfg.retry?.maxDelayMs ?? 8_000;

    let lastError: ChatError | undefined;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const generator = await attempt();
        for await (const chunk of generator) {
          yield chunk;
        }
        return;
      } catch (err) {
        const ce = toChatError(err);
        if (signalAborted(ce)) throw ce;
        lastError = ce;
        if (!ce.retryable || i === maxAttempts - 1) throw ce;
        const delay = Math.min(maxDelay, initialDelay * Math.pow(2, i));
        await sleep(delay);
      }
    }
    if (lastError) throw lastError;
  }

  protected abstract buildRequest(
    req: ChatRequest,
    cfg: ChatConfig,
  ): { url: string; headers: Record<string, string>; body: string };

  protected abstract parseStream(
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ): AsyncGenerator<ChatResponseChunk, void>;
}

/**
 * Combines the adapter's own controller signal with the caller's signal.
 * If either is aborted the combined signal reports aborted.
 */
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

function signalAborted(err: ChatError): boolean {
  return err.code === "aborted";
}

async function safeReadErrorBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 8_000);
  } catch {
    return "";
  }
}

function toAbortError(): ChatError {
  return {
    code: "aborted",
    message: "Request aborted by the user.",
    retryable: false,
  };
}

function toNetworkError(err: unknown): ChatError {
  const e = toError(err);
  return {
    code: "network",
    message: `Network error: ${e.message}`,
    cause: err,
    retryable: true,
  };
}

function toHttpError(status: number, body: string): ChatError {
  const code: ChatError["code"] =
    status === 401 || status === 403
      ? "auth"
      : status === 429
      ? "rate_limit"
      : status === 400
      ? "bad_request"
      : status >= 500
      ? "server"
      : "unknown";
  return {
    code,
    status,
    message: `${status} ${code.toUpperCase()}: ${body.slice(0, 500) || "(empty body)"}`,
    retryable: code === "rate_limit" || code === "server",
    cause: body,
  };
}

function toParseError(message: string): ChatError {
  return { code: "parse", message, retryable: false };
}

export function toChatError(err: unknown): ChatError {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    return err as ChatError;
  }
  const e = toError(err);
  return {
    code: "unknown",
    message: e.message || "Unknown error",
    cause: err,
    retryable: false,
  };
}

/**
 * Convert a ChatMessage[] into a unified prompt payload the adapters
 * format further. Returns the user/assistant/tool messages only;
 * system messages are handled separately by each provider.
 */
export interface NormalizedPrompt {
  system: string;
  messages: { role: Role; content: string; name?: string; toolCallId?: string }[];
}

export function normalizePrompt(
  cfg: ChatConfig,
  messages: ChatMessage[],
): NormalizedPrompt {
  const systemParts: string[] = [];
  if (cfg.personality) {
    const p = cfg.personality;
    const toneDesc = describeTone(p.tone);
    const lines: string[] = [];
    if (p.name) lines.push(`You are ${p.name}.`);
    if (p.customTone) lines.push(p.customTone);
    else if (toneDesc) lines.push(toneDesc);
    if (p.locale) lines.push(`Reply in locale: ${p.locale}.`);
    if (lines.length) systemParts.push(lines.join(" "));
  }
  if (cfg.systemPrompt) systemParts.push(cfg.systemPrompt);
  if (cfg.documents?.length) {
    const always = cfg.documents.filter((d) => d.alwaysOn);
    if (always.length) {
      systemParts.push(
        "## Context documents (always available)\n" +
          always.map((d) => `### ${d.name}\n${d.body}`).join("\n\n"),
      );
    }
  }
  const rest = messages.filter((m) => m.role !== "system");
  return {
    system: systemParts.join("\n\n"),
    messages: rest.map((m) => ({
      role: m.role,
      content: m.content,
      name: (m as ChatMessage & { name?: string }).name,
      toolCallId: (m as ChatMessage & { toolCallId?: string }).toolCallId,
    })),
  };
}

function describeTone(tone: string | undefined): string {
  switch (tone) {
    case "friendly":
      return "You are warm and approachable. Default to plain language.";
    case "professional":
      return "You are formal, precise, and avoid filler.";
    case "casual":
      return "You are relaxed, conversational, and use contractions.";
    case "concise":
      return "You are terse. One paragraph max unless asked otherwise.";
    case "playful":
      return "You are witty, light-hearted, and use occasional humor.";
    case "academic":
      return "You cite sources and quantify uncertainty.";
    case "sarcastic":
      return "You are dry and ironic, but always accurate.";
    default:
      return tone ?? "";
  }
}

/**
 * Reads a `text/event-stream` or `application/x-ndjson` response chunk by chunk
 * and yields complete events. Handles backpressure correctly.
 */
export async function*readSseStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  options: { delimiter?: "\n\n" | "\n"; trimPrefix?: string } = {},
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  const delimiter = options.delimiter ?? "\n\n";
  let buffer = "";
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf(delimiter)) >= 0) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + delimiter.length);
        if (raw.trim().length === 0) continue;
        yield stripSsePrefix(raw, options.trimPrefix);
      }
    }
    if (buffer.trim().length > 0) yield stripSsePrefix(buffer, options.trimPrefix);
  } finally {
    reader.releaseLock();
  }
}

function stripSsePrefix(raw: string, trimPrefix = "data:"): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith(trimPrefix)) {
      out.push(line.slice(trimPrefix.length).trimStart());
    } else if (line.startsWith(":")) {
      // SSE comment — skip.
    } else if (line.startsWith("event:")) {
      // SSE event id line (Anthropic sends these alongside `data:`) — skip
      // so the JSON payload on the next line parses cleanly.
    } else if (line.startsWith("id:") || line.startsWith("retry:")) {
      // SSE metadata fields — skip.
    } else if (line.trim().length > 0) {
      out.push(line);
    }
  }
  return out.join("\n");
}

/** Helper to surface a chunk-level error consistently across adapters. */
export function errorChunk(err: unknown): ChatResponseChunk {
  return { error: toChatError(err), finishReason: "error" };
}

/** Helper for the (rare) empty-stream case. */
export function emptyChunk(): ChatResponseChunk {
  return {};
}

/** Stable unique id helper, exposed for adapters that need to label tool calls. */
export const toolCallId = (): string => `tc_${uid()}`;