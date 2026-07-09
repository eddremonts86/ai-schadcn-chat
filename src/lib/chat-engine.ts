import type {
  AttachmentMeta,
  ChatConfig,
  ChatError,
  ChatMessage,
  ChatResponseChunk,
  ConversationMeta,
  ProviderAdapter,
  Role,
  ToolCallRecord,
  ToolDefinition,
} from "../types/chat.js";
import { createProvider } from "../providers/index.js";
import {
  estimateTokens,
  sleep,
  toError,
  trimMessagesByTokens,
  uid,
} from "./utils.js";
import { filesToAttachments, serializeUserContent } from "./attachments.js";
import {
  listConversations as listPersistedConversations,
  loadConversation,
  saveConversation,
  trimPersisted,
} from "./persistence.js";
import { toChatError } from "../providers/base.js";

/**
 * Public, framework-agnostic chat engine. Wraps a streaming ProviderAdapter
 * and exposes a subscribe-based API for any UI framework (React/Vue/Solid).
 *
 * - Conversations have a stable id; switching ids swaps the active buffer
 * - messages stream incrementally; partial content is observable mid-flight
 * - tool calls are dispatched through user-supplied handlers when present
 * - persistence is opt-in via `cfg.persistKey`
 */
export class ChatEngine {
  private config: ChatConfig;
  private provider: ProviderAdapter;
  private listeners = new Set<() => void>();
  private conversations = new Map<string, ConversationState>();
  private activeId: string;

  constructor(config: ChatConfig, initialConversationId?: string) {
    this.config = config;
    this.provider = createProvider(config);
    this.activeId = initialConversationId ?? uid("conv");
    if (this.config.persistKey) {
      // Restore active conversation if it was persisted with the same key prefix.
      // For now: restore the active id if it exists.
      const persisted = loadConversation(this.activeId);
      if (persisted) {
        this.conversations.set(this.activeId, {
          id: this.activeId,
          messages: persisted.messages,
        });
      } else {
        this.conversations.set(this.activeId, { id: this.activeId, messages: [] });
      }
    } else {
      this.conversations.set(this.activeId, { id: this.activeId, messages: [] });
    }
  }

  public getConfig(): ChatConfig {
    return this.config;
  }

  public updateConfig(partial: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.provider || partial.model) {
      this.provider = createProvider(this.config);
    }
    this.emit();
  }

  public getActiveConversationId(): string {
    return this.activeId;
  }

  public setActiveConversationId(id: string): void {
    if (!this.conversations.has(id)) {
      // Hydrate from persistence when switching to a stored conversation
      // that isn't in memory yet; otherwise start a fresh empty one.
      const persisted = this.config.persistKey ? loadConversation(id) : null;
      this.conversations.set(id, { id, messages: persisted?.messages ?? [] });
    }
    this.activeId = id;
    this.emit();
  }

  public listConversationIds(): string[] {
    return Array.from(this.conversations.keys());
  }

  /**
   * Rich conversation list for history menus: a title (first user message),
   * last-updated timestamp, and message count. Merges in-memory conversations
   * with persisted ones (persisted wins for title/timestamp). Sorted newest
   * first; the active conversation is always present.
   */
  public listConversationsMeta(): ConversationMeta[] {
    const metas = new Map<string, ConversationMeta>();
    for (const conv of this.conversations.values()) {
      metas.set(conv.id, {
        id: conv.id,
        title: deriveTitle(conv.messages),
        updatedAt: 0,
        messageCount: conv.messages.length,
      });
    }
    if (this.config.persistKey) {
      for (const p of listPersistedConversations()) {
        const existing = metas.get(p.id);
        metas.set(p.id, {
          id: p.id,
          title: p.title || existing?.title || "New chat",
          updatedAt: p.updatedAt,
          messageCount: p.messages.length,
        });
      }
    }
    return Array.from(metas.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getMessages(): ChatMessage[] {
    return this.conversations.get(this.activeId)?.messages ?? [];
  }

  /**
   * Returns a shallow copy of the active conversation's messages,
   * cached between `emit()` calls and only rebuilt when the engine
   * signals a real change.
   *
   * Why this exists: React bindings consume this via `useSyncExternalStore`,
   * which bails out when the snapshot reference is identical to the
   * previous one (that's the contract). Because we mutate `messages`
   * in place (`push`, etc.) the underlying array reference never changes
   * — so the user bubble would never render. The fix is to cache a fresh
   * copy between `emit()` calls and invalidate the cache when something
   * actually changes. Returning a NEW array on every call would itself
   * infinite-loop the snapshot.
   */
  private snapshotCache: ChatMessage[] = [];
  private snapshotDirty = true;

  public getMessagesSnapshot(): ChatMessage[] {
    if (this.snapshotDirty) {
      const msgs = this.conversations.get(this.activeId)?.messages;
      this.snapshotCache = msgs ? [...msgs] : [];
      this.snapshotDirty = false;
    }
    return this.snapshotCache;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.snapshotDirty = true;
    for (const l of this.listeners) l();
  }

  private persist(): void {
    if (!this.config.persistKey) return;
    const conv = this.conversations.get(this.activeId);
    if (!conv) return;
    const first = conv.messages.find((m) => m.role === "user");
    const title = first ? truncate(first.content.replace(/[\n\r]+/g, " "), 60) : "New chat";
    saveConversation(
      trimPersisted({
        id: conv.id,
        title,
        messages: conv.messages,
        updatedAt: Date.now(),
        config: { model: this.config.model.id, temperature: this.config.temperature },
      }),
    );
  }

  /**
   * Public: stop the currently streaming response, if any.
   */
  public abort(): void {
    this.provider.abort();
  }

  /**
   * Public: clear the active conversation.
   */
  public clear(): void {
    this.conversations.set(this.activeId, { id: this.activeId, messages: [] });
    this.persist();
    this.emit();
  }

  /**
   * Public: switch the active conversation (creates it if missing).
   */
  public newConversation(): string {
    const id = uid("conv");
    this.conversations.set(id, { id, messages: [] });
    this.activeId = id;
    this.persist();
    this.emit();
    return id;
  }

  /** Public: remove a single message from the active conversation. */
  public deleteMessage(messageId: string): void {
    const conv = this.conversations.get(this.activeId);
    if (!conv) return;
    conv.messages = conv.messages.filter((m) => m.id !== messageId);
    this.persist();
    this.emit();
  }

  public deleteConversation(id: string): void {
    this.conversations.delete(id);
    if (this.activeId === id) {
      this.activeId = this.conversations.keys().next().value ?? uid("conv");
      this.conversations.set(this.activeId, { id: this.activeId, messages: [] });
    }
    this.persist();
    this.emit();
  }

  /**
   * Public: edit a previous user message and re-run the assistant from there.
   * Truncates all messages after `messageId` and triggers a new completion.
   */
  public async editAndResend(messageId: string, newContent: string): Promise<void> {
    const conv = this.conversations.get(this.activeId);
    if (!conv) return;
    const idx = conv.messages.findIndex((m) => m.id === messageId);
    if (idx < 0 || conv.messages[idx].role !== "user") return;
    conv.messages[idx] = { ...conv.messages[idx], content: newContent, status: "complete" };
    conv.messages = conv.messages.slice(0, idx + 1);
    this.emit();
    this.persist();
    await this.runCompletion();
  }

  /**
   * Public: re-run the assistant for the most recent user turn.
   */
  public async regenerate(): Promise<void> {
    const conv = this.conversations.get(this.activeId);
    if (!conv) return;
    // Drop the last assistant message (or error).
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === "assistant") {
        conv.messages.splice(i, 1);
        break;
      }
      if (conv.messages[i].role === "user") break;
    }
    this.emit();
    this.persist();
    await this.runCompletion();
  }

  /**
   * Public: send a user message (optionally with attachments) and stream the
   * assistant reply.
   */
  public async sendUserMessage(text: string, attachments?: AttachmentMeta[]): Promise<void> {
    const conv = this.conversations.get(this.activeId);
    if (!conv) return;
    if (!text.trim() && !attachments?.length) return;

    const content = serializeUserContent(
      text,
      attachments,
      this.config.model.provider ?? this.config.provider.kind,
    );

    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content,
      attachments,
      createdAt: Date.now(),
      status: "complete",
    };
    conv.messages.push(userMsg);
    this.emit();
    this.persist();

    await this.runCompletion();
  }

  /**
   * Public: send files (browser File objects) directly. Convenience wrapper
   * around sendUserMessage + filesToAttachments.
   */
  public async sendFiles(text: string, files: File[]): Promise<void> {
    const attachments = await filesToAttachments(files, this.config);
    return this.sendUserMessage(text, attachments);
  }

  /**
   * Internal: stream one assistant turn. Handles tool calls in a loop
   * (max 8 iterations to prevent infinite loops).
   */
  private async runCompletion(): Promise<void> {
    const conv = this.conversations.get(this.activeId);
    if (!conv) return;

    const assistantId = uid("msg");
    let assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      status: "streaming",
    };
    conv.messages.push(assistantMsg);

    const maxIter = 8;
    for (let iter = 0; iter < maxIter; iter++) {
      try {
        const { toolCalls, finished, finalUsage, model } =
          await this.streamAssistantTurn(assistantMsg, conv);

        if (toolCalls.length > 0 && this.config.tools?.length) {
          assistantMsg.status = "complete";
          // Materialize tool-call records on the assistant message.
          assistantMsg.toolCalls = toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            status: tc.error ? ("error" as const) : ("complete" as const),
            result: tc.result,
            error: tc.error,
          }));

          // Execute each tool and append tool messages.
          for (const tc of toolCalls) {
            const def = this.config.tools?.find((t) => t.name === tc.name);
            const toolMsg: ChatMessage = {
              id: uid("msg"),
              role: "tool",
              content: tc.error
                ? `Error: ${tc.error}`
                : typeof tc.result === "string"
                ? tc.result
                : JSON.stringify(tc.result ?? null),
              createdAt: Date.now(),
              status: "complete",
              toolCallId: tc.id,
              name: tc.name,
            };
            conv.messages.push(toolMsg);
            this.emit();
            this.persist();
            // If a tool produced a result we want the assistant to react to,
            // we let the next iteration append another assistant message.
            // To support that, push a fresh assistant placeholder so the loop
            // continues the conversation. We only do this when the tool
            // returned a usable payload (no error) AND there are still
            // iterations left.
            if (!tc.error && iter < maxIter - 1) {
              assistantId;
              assistantMsg = {
                id: uid("msg"),
                role: "assistant",
                content: "",
                createdAt: Date.now(),
                status: "streaming",
              };
              conv.messages.push(assistantMsg);
            }
          }
          if (!finished) continue;
          break;
        }

        if (finished) {
          assistantMsg.status = "complete";
          assistantMsg.completedAt = Date.now();
          if (finalUsage) assistantMsg.usage = finalUsage;
          if (model) assistantMsg.model = model;
          break;
        }
      } catch (err) {
        const ce = toChatError(err);
        assistantMsg.status = "error";
        assistantMsg.error = ce;
        this.config.onError?.(ce, { conversationId: this.activeId });
        this.emit();
        this.persist();
        return;
      }
    }

    this.config.onResponse?.(assistantMsg, { conversationId: this.activeId });
    this.emit();
    this.persist();
  }

  /**
   * Streams one assistant message. Returns:
   * - toolCalls: tool_use / tool_calls chunks collected during the stream
   * - finished: true if the API emitted a non-tool finish reason
   * - finalUsage / model: usage & model metadata when available
   */
  private async streamAssistantTurn(
    assistantMsg: ChatMessage,
    conv: ConversationState,
  ): Promise<{
    toolCalls: Array<ToolCallRecord & { arguments: Record<string, unknown> }>;
    finished: boolean;
    finalUsage?: ChatMessage["usage"];
    model?: string;
  }> {
    const maxTokens = this.config.maxContextTokens ?? 32_000;
    const messages = trimMessagesByTokens(conv.messages, maxTokens);

    const collected = new Map<
      string,
      { id: string; name: string; arguments: Record<string, unknown> | string; raw: string }
    >();
    let buffer = "";
    let reasoningBuffer = "";
    let finishReason: ChatResponseChunk["finishReason"];
    let finalUsage: ChatMessage["usage"];
    let finalModel: string | undefined;

    const stream = this.provider.stream(
      {
        messages,
        signal: undefined,
      },
      this.config,
    );

    let lastError: ChatError | undefined;

    for await (const chunk of stream) {
      if (chunk.error) {
        lastError = chunk.error;
        buffer += chunk.error.message ? `\n\n[error] ${chunk.error.message}` : "";
        finishReason = "error";
        break;
      }
      if (chunk.model) finalModel = chunk.model;
      if (chunk.usage) finalUsage = chunk.usage;
      if (chunk.finishReason) finishReason = chunk.finishReason;
      if (chunk.delta) {
        if (!assistantMsg.startedAt) assistantMsg.startedAt = Date.now();
        if (chunk.delta.startsWith("\u0000think:")) {
          reasoningBuffer += chunk.delta.slice("\u0000think:".length);
          assistantMsg.reasoning = reasoningBuffer;
        } else {
          buffer += chunk.delta;
          assistantMsg.content = buffer;
        }
        this.emit();
      }
      if (chunk.toolCall) {
        const tc = collected.get(chunk.toolCall.id) ?? {
          id: chunk.toolCall.id,
          name: chunk.toolCall.name,
          arguments: "",
          raw: "",
        };
        if (chunk.toolCall.name) tc.name = chunk.toolCall.name;
        if (chunk.toolCall.arguments) tc.raw += chunk.toolCall.arguments;
        tc.arguments = tc.raw;
        collected.set(chunk.toolCall.id, tc);
        this.emit();
      }
    }

    // Persist incremental buffer onto the assistant message.
    assistantMsg.content = buffer;

    // Materialize tool-call records.
    const toolCalls: Array<ToolCallRecord & { arguments: Record<string, unknown> }> = [];
    for (const tc of collected.values()) {
      let parsedArgs: Record<string, unknown> = {};
      if (typeof tc.raw === "string" && tc.raw.trim().length > 0) {
        try {
          parsedArgs = JSON.parse(tc.raw);
        } catch {
          parsedArgs = { raw: tc.raw };
        }
      }
      const def = this.config.tools?.find((t) => t.name === tc.name);
      let result: unknown;
      let error: string | undefined;
      if (def?.handler) {
        try {
          const handlerResult = await def.handler(parsedArgs, { conversationId: this.activeId });
          result = handlerResult;
        } catch (err) {
          error = (err instanceof Error ? err.message : String(err)) || "Tool failed";
        }
      } else {
        // No handler — surface a soft warning so the model can still react.
        result = { ok: false, message: `No handler registered for tool "${tc.name}".` };
      }
      toolCalls.push({
        id: tc.id,
        name: tc.name,
        arguments: parsedArgs,
        status: error ? ("error" as const) : ("complete" as const),
        result,
        error,
      });
    }

    if (lastError) throw lastError;

    const finished = finishReason === "stop" || finishReason === "length" || finishReason === "content_filter";
    const hasToolCalls = toolCalls.length > 0;
    return { toolCalls, finished: finished && !hasToolCalls, finalUsage, model: finalModel };
  }
}

interface ConversationState {
  id: string;
  messages: ChatMessage[];
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Derive a human title from the first user message (ignores JSON markers). */
function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  let content = first.content;
  if (content.startsWith("{")) {
    try {
      const parsed = JSON.parse(content) as {
        __type?: string;
        blocks?: { type?: string; text?: string }[];
      };
      if (parsed?.__type === "ai-chat-blocks") {
        content =
          parsed.blocks
            ?.map((b) => (b.type === "text" ? (b.text ?? "") : ""))
            .filter(Boolean)
            .join(" ") || "Attachment";
      }
    } catch {
      /* keep raw */
    }
  }
  return truncate(content.replace(/[\n\r]+/g, " ").trim(), 60) || "New chat";
}