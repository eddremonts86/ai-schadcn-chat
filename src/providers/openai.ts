import type {
  ChatConfig,
  ChatMessage,
  ChatRequest,
  ChatResponseChunk,
} from "../types/chat.js";
import {
  BaseProviderAdapter,
  errorChunk,
  normalizePrompt,
  readSseStream,
  toChatError,
} from "./base.js";

/**
 * OpenAI Chat Completions adapter. Handles both:
 *  - "openai"             → native OpenAI Chat Completions
 *  - "openai-compatible"  → any provider that speaks the same protocol
 *                          (OpenRouter, MiniMax, Together, Groq, vLLM, Ollama /openai, etc.)
 *
 * MiniMax docs: https://api.MiniMax.chat/v1/chat/completions
 * Compatible with the OpenAI streaming schema (data: {choices: [{delta: ...}]} \n\n\n\n).
 */
export class OpenAIProvider extends BaseProviderAdapter {
  public readonly kind: "openai" | "openai-compatible";

  public constructor(kind: "openai" | "openai-compatible") {
    super();
    this.kind = kind;
  }

  protected buildRequest(
    req: ChatRequest,
    cfg: ChatConfig,
  ): { url: string; headers: Record<string, string>; body: string } {
    const baseUrl = cfg.provider.baseUrl.replace(/\/+$/, "");
    const chatPath = cfg.provider.chatPath ?? "/chat/completions";
    const url = `${baseUrl}${chatPath}`;
    const headers = this.buildHeaders(cfg);
    const prompt = normalizePrompt(cfg, req.messages);

    // Build the messages array. System messages from `cfg.systemPrompt` and
    // personality + alwaysOn docs are pre-merged by `normalizePrompt`.
    const messages: unknown[] = [];
    if (prompt.system) {
      messages.push({ role: "system", content: prompt.system });
    }
    for (const m of prompt.messages) {
      const blocks = encodeUserBlocks(m.content, cfg, m.role);
      if (blocks) {
        messages.push({ role: m.role, content: blocks });
      } else if (m.role === "tool") {
        messages.push({ role: "tool", content: m.content, tool_call_id: m.toolCallId ?? m.name });
      } else {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const body: Record<string, unknown> = {
      model: cfg.model.id,
      messages,
      stream: true,
      ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
      ...(cfg.topP !== undefined ? { top_p: cfg.topP } : {}),
      ...(cfg.stopSequences?.length ? { stop: cfg.stopSequences } : {}),
      ...(cfg.model.maxOutput ? { max_tokens: cfg.model.maxOutput } : {}),
    };
    if (cfg.tools?.length) {
      body.tools = cfg.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    return { url, headers, body: JSON.stringify(body) };
  }

  protected async *parseStream(
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ): AsyncGenerator<ChatResponseChunk, void> {
    let finishReason: ChatResponseChunk["finishReason"];
    let usage: ChatResponseChunk["usage"];
    let model: string | undefined;

    for await (const event of readSseStream(body, signal)) {
      if (!event || event === "[DONE]") continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(event);
      } catch (err) {
        yield errorChunk(toChatError(err));
        continue;
      }
      const e = parsed as OpenAIEvent;
      model = e.model ?? model;
      if (e.usage) {
        usage = {
          promptTokens: e.usage.prompt_tokens,
          completionTokens: e.usage.completion_tokens,
          totalTokens: e.usage.total_tokens,
        };
      }
      for (const choice of e.choices ?? []) {
        if (choice.finish_reason) finishReason = mapFinishReason(choice.finish_reason);
        const delta = choice.delta;
        if (!delta) continue;
        if (delta.content) yield { delta: delta.content };
        if (delta.reasoning_content) yield { delta: `\u0000think:${delta.reasoning_content}` };
        for (const tc of delta.tool_calls ?? []) {
          yield {
            toolCall: {
              id: tc.id ?? "tool_call",
              name: tc.function?.name ?? "",
              arguments: tc.function?.arguments ?? "",
            },
          };
        }
      }
    }

    if (finishReason || usage || model) {
      yield { finishReason, usage, model };
    }
  }

  private buildHeaders(cfg: ChatConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(cfg.provider.defaultHeaders ?? {}),
      ...(cfg.model.headers ?? {}),
    };
    const auth = cfg.provider.authHeader ?? "bearer";
    if (auth === "bearer") {
      headers.authorization = `Bearer ${cfg.provider.credentials.apiKey}`;
    } else if (auth === "x-api-key") {
      headers["x-api-key"] = cfg.provider.credentials.apiKey;
    } else {
      headers[auth.name] = `${auth.prefix ?? ""}${cfg.provider.credentials.apiKey}`;
    }
    if (cfg.provider.organization) {
      headers["OpenAI-Organization"] = cfg.provider.organization;
    }
    if (cfg.provider.project) {
      headers["OpenAI-Project"] = cfg.provider.project;
    }
    return headers;
  }
}

interface OpenAIEvent {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    delta?: {
      content?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
}

function mapFinishReason(reason: string): ChatResponseChunk["finishReason"] {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
    case "max_tokens":
      return "length";
    case "tool_calls":
      return "tool_calls";
    case "content_filter":
      return "content_filter";
    default:
      return undefined;
  }
}

/**
 * Encode a user message body. When it starts with the structured marker,
 * we expand it into the OpenAI multimodal content array (text + image_url).
 * Plain strings pass through untouched.
 */
function encodeUserBlocks(
  content: string,
  _cfg: ChatConfig,
  role: string,
): unknown[] | null {
  if (role !== "user") return null;
  if (!content.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.__type !== "ai-chat-blocks") return null;
    return parsed.blocks as unknown[];
  } catch {
    return null;
  }
}

/**
 * Build OpenAI-compatible user content (text + image_url blocks) from
 * attachments. Used by the higher-level attachment helper.
 */
export function buildOpenAIUserContent(opts: {
  text: string;
  attachments: ChatMessage["attachments"];
}): unknown[] {
  const blocks: unknown[] = [];
  for (const att of opts.attachments ?? []) {
    if (att.mimeType.startsWith("image/") && att.dataUrl) {
      blocks.push({ type: "image_url", image_url: { url: att.dataUrl } });
    } else if (att.url) {
      blocks.push({ type: "image_url", image_url: { url: att.url } });
    } else if (att.text) {
      blocks.push({ type: "text", text: `Attachment: ${att.name}\n\`\`\`\n${att.text}\n\`\`\`` });
    }
  }
  if (opts.text) blocks.push({ type: "text", text: opts.text });
  return blocks;
}