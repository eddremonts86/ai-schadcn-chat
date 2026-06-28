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
 * Anthropic Messages API adapter.
 * Docs: https://docs.anthropic.com/en/api/messages
 *
 * Supports streaming text + tool use. Vision-capable models accept image
 * attachments as base64 `image` blocks. PDF attachments are sent as
 * `document` blocks (Anthropic's native format).
 */
export class AnthropicProvider extends BaseProviderAdapter {
  public readonly kind = "anthropic" as const;

  protected buildRequest(
    req: ChatRequest,
    cfg: ChatConfig,
  ): { url: string; headers: Record<string, string>; body: string } {
    const baseUrl = cfg.provider.baseUrl.replace(/\/+$/, "");
    const chatPath = cfg.provider.chatPath ?? "/v1/messages";
    const url = `${baseUrl}${chatPath}`;
    const headers = this.buildHeaders(cfg);
    const prompt = normalizePrompt(cfg, req.messages);

    const body = {
      model: cfg.model.id,
      max_tokens: cfg.model.maxOutput ?? 4096,
      system: prompt.system,
      messages: prompt.messages
        .filter((m) => m.role !== "system")
        .map((m) => normalizeAnthropicMessage(m as { role: "user" | "assistant" | "tool"; content: string; name?: string; toolCallId?: string }, cfg)),
      stream: true,
      ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
      ...(cfg.topP !== undefined ? { top_p: cfg.topP } : {}),
      ...(cfg.stopSequences?.length ? { stop_sequences: cfg.stopSequences } : {}),
      ...(cfg.thinking?.enabled
        ? {
            thinking: {
              type: "enabled" as const,
              budget_tokens: cfg.thinking.budgetTokens ?? 1024,
            },
          }
        : {}),
      ...(cfg.tools?.length
        ? {
            tools: cfg.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters,
            })),
          }
        : {}),
    };

    return { url, headers, body: JSON.stringify(body) };
  }

  protected async *parseStream(
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ): AsyncGenerator<ChatResponseChunk, void> {
    let currentToolId: string | null = null;
    let currentToolName: string | null = null;
    let currentToolInput = "";

    for await (const event of readSseStream(body, signal)) {
      if (!event || event === "[DONE]") continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(event);
      } catch (err) {
        yield errorChunk(toChatError(err));
        continue;
      }
      const e = parsed as AnthropicEvent;
      switch (e.type) {
        case "message_start": {
          yield { model: e.message?.model };
          break;
        }
        case "content_block_start": {
          const block = e.content_block;
          if (block?.type === "tool_use") {
            currentToolId = block.id ?? "";
            currentToolName = block.name ?? "";
            currentToolInput = "";
            yield {
              toolCall: { id: block.id ?? "", name: block.name ?? "", arguments: "" },
            };
          }
          break;
        }
        case "content_block_delta": {
          const delta = e.delta;
          if (delta?.type === "text_delta" && delta.text) {
            yield { delta: delta.text };
          } else if (delta?.type === "input_json_delta" && delta.partial_json) {
            currentToolInput += delta.partial_json;
            if (currentToolId && currentToolName) {
              yield {
                toolCall: {
                  id: currentToolId,
                  name: currentToolName,
                  arguments: currentToolInput,
                },
              };
            }
          } else if (delta?.type === "thinking_delta" && delta.thinking) {
            // Treat extended thinking as a hidden meta chunk; UI may surface it.
            yield { delta: `\u0000think:${delta.thinking}` };
          }
          break;
        }
        case "content_block_stop": {
          if (currentToolId) {
            currentToolId = null;
            currentToolName = null;
            currentToolInput = "";
          }
          break;
        }
        case "message_delta": {
          const usage = e.usage;
          yield {
            finishReason: mapAnthropicStopReason(e.delta?.stop_reason),
            usage: usage
              ? {
                  promptTokens: usage.input_tokens,
                  completionTokens: usage.output_tokens,
                  totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
                }
              : undefined,
          };
          break;
        }
        case "message_stop": {
          return;
        }
        case "error": {
          yield {
            error: {
              code: "server",
              message: (e as { error?: { message?: string } }).error?.message ?? "Anthropic stream error",
              retryable: false,
            },
            finishReason: "error",
          };
          return;
        }
        default:
          break;
      }
    }
  }

  private buildHeaders(cfg: ChatConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      ...(cfg.provider.defaultHeaders ?? {}),
      ...(cfg.model.headers ?? {}),
    };
    const auth = cfg.provider.authHeader ?? "x-api-key";
    if (auth === "x-api-key") {
      headers["x-api-key"] = cfg.provider.credentials.apiKey;
    } else if (auth === "bearer") {
      headers.Authorization = `Bearer ${cfg.provider.credentials.apiKey}`;
    } else {
      headers[auth.name] = `${auth.prefix ?? ""}${cfg.provider.credentials.apiKey}`;
    }
    if (cfg.provider.credentials.secondaryKey) {
      headers[cfg.provider.credentials.secondaryKeyHeader ?? "x-secondary-key"] =
        cfg.provider.credentials.secondaryKey;
    }
    if (cfg.provider.organization) {
      headers["anthropic-organization"] = cfg.provider.organization;
    }
    if (cfg.provider.project) {
      headers["anthropic-project"] = cfg.provider.project;
    }
    return headers;
  }
}

interface AnthropicEvent {
  type: string;
  message?: { model?: string };
  content_block?: {
    type: string;
    id?: string;
    name?: string;
    input?: unknown;
  };
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
    thinking?: string;
    stop_reason?: string;
  };
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

function normalizeAnthropicMessage(
  m: { role: "user" | "assistant" | "tool"; content: string; name?: string },
  cfg: ChatConfig,
) {
  // For now we serialize user messages with attachments as Anthropic content blocks.
  // The attachment parsing is left to the higher-level helper in lib/attachments.ts.
  // If the content is plain string, send as string. Else, send as block array.
  const blocks = parseUserBlocks(m.content, cfg);
  if (blocks) {
    return { role: m.role, content: blocks };
  }
  return { role: m.role, content: m.content };
}

function parseUserBlocks(
  content: string,
  _cfg: ChatConfig,
): unknown[] | null {
  // We use a JSON-encoded marker to ship structured user content
  // ({"__type":"ai-chat-blocks","blocks":[…]}). When we see the marker
  // we expand it into the provider-native block format. Plain strings
  // pass through untouched.
  if (!content.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.__type !== "ai-chat-blocks") return null;
    return parsed.blocks as unknown[];
  } catch {
    return null;
  }
}

function mapAnthropicStopReason(
  reason?: string,
): ChatResponseChunk["finishReason"] {
  switch (reason) {
    case "end_turn":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    case "refusal":
      return "content_filter";
    default:
      return undefined;
  }
}

/**
 * Builds an Anthropic-shaped user content array (text + image/document blocks)
 * from a list of attachments + the user's plain text prompt.
 * Used by the higher-level attachment helper.
 */
export function buildAnthropicUserContent(opts: {
  text: string;
  attachments: ChatMessage["attachments"];
}): unknown[] {
  const blocks: unknown[] = [];
  for (const att of opts.attachments ?? []) {
    if (att.mimeType.startsWith("image/") && att.dataUrl) {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: att.mimeType, data: stripDataUrlPrefix(att.dataUrl) },
      });
    } else if (att.mimeType === "application/pdf" && att.dataUrl) {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: stripDataUrlPrefix(att.dataUrl) },
      });
    } else if (att.text) {
      blocks.push({ type: "text", text: `Attachment: ${att.name}\n\`\`\`\n${att.text}\n\`\`\`` });
    }
  }
  if (opts.text) blocks.push({ type: "text", text: opts.text });
  return blocks;
}

function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}