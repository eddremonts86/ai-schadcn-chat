/**
 * Single message bubble. Renders a user/assistant/system/tool message
 * with avatar, attachments, markdown body, tool calls, action bar,
 * and streaming caret.
 */
import {
  AlertCircle,
  Check,
  Copy,
  Pencil,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import { memo, useState, type ReactNode } from "react";
import { useChat } from "../../hooks/useChat.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { Textarea } from "../ui/input.js";
import { cn, formatTime } from "../../lib/utils.js";
import { summarizeUserMessage } from "../../lib/attachments.js";
import type { ChatMessage, ToolCallRecord } from "../../types/chat.js";
import { AttachmentChips } from "./AttachmentChips.js";
import { Markdown } from "./Markdown.js";
import { ToolCallBadge } from "./ToolCallBadge.js";
import { ThinkingDots } from "./ThinkingDots.js";
import { BubbleAvatar } from "./bubble-avatar.js";

export interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLast?: boolean;
  className?: string;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming,
  isLast,
  className,
}: MessageBubbleProps) {
  const chat = useChat();
  const cfg = chat.config;
  const ui = cfg.ui ?? {};
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isTool = message.role === "tool";
  const isAssistant = message.role === "assistant";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summarizeUserMessage(message));
  const [copied, setCopied] = useState(false);

  if (isSystem) {
    return (
      <div className={cn("my-2 flex justify-center", className)}>
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
          system
        </Badge>
      </div>
    );
  }

  if (isTool) {
    return (
      <div className={cn("my-3 flex gap-2 pl-12", className)}>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {message.name ?? "tool"}
        </Badge>
        <pre className="flex-1 overflow-x-auto rounded-md border bg-muted/30 p-2 text-xs">
          {message.content}
        </pre>
      </div>
    );
  }

  const assistantName = cfg.personality?.name ?? "Assistant";
  const userName = "You";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const onSaveEdit = async () => {
    setEditing(false);
    await chat.engine.editAndResend(message.id, draft);
  };

  const onRegenerate = () => chat.engine.regenerate();
  const onStop = () => chat.engine.abort();

  const userText = summarizeUserMessage(message);

  const showEdit = isUser && (ui.enableEdit ?? true) && !isStreaming;
  const showRegenerate = isAssistant && (ui.enableRegenerate ?? true) && isLast && !isStreaming;
  const showCopy = (ui.enableCopyButtons ?? true);
  const showActions = showEdit || showRegenerate || showCopy;

  const time = formatTime(message.createdAt);
  const tokenSummary = message.usage
    ? `${message.usage.totalTokens ?? ((message.usage.promptTokens ?? 0) + (message.usage.completionTokens ?? 0))} tokens`
    : null;

  return (
    <div
      data-role={message.role}
      data-message-id={message.id}
      className={cn(
        "group/message flex w-full gap-3 px-4 py-3",
        isUser && "bg-chat-user/30",
        isAssistant && "bg-chat-assistant/20",
        "animate-fade-in",
        className,
      )}
    >
      <BubbleAvatar
        name={isUser ? userName : assistantName}
        role={isUser ? "user" : "assistant"}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {isUser ? userName : assistantName}
          </span>
          {(ui.showTimestamps ?? true) && time && <span>· {time}</span>}
          {(ui.showTokenCount ?? true) && tokenSummary && <span>· {tokenSummary}</span>}
          {message.model && <span className="font-mono">· {message.model}</span>}
          {message.status === "error" && (
            <span className="inline-flex items-center gap-1 text-rose-500">
              <AlertCircle className="h-3 w-3" /> error
            </span>
          )}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <AttachmentChips attachments={message.attachments} />
        )}

        {isUser && editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.min(8, draft.split("\n").length + 1)}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSaveEdit}>
                Save & resend
              </Button>
            </div>
          </div>
        ) : isUser ? (
          <UserBody text={userText} />
        ) : (
          <>
            {message.content.length === 0 && isStreaming ? (
              <ThinkingDots label={isLast ? "Generating…" : "Thinking"} />
            ) : (
              (ui.enableMarkdown ?? true) && (
                <Markdown
                  content={message.content}
                  streaming={isStreaming && isLast}
                />
              )
            )}
            {(ui.showToolCalls ?? true) && message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {message.toolCalls.map((tc: ToolCallRecord) => (
                  <ToolCallBadge key={tc.id} tool={tc} />
                ))}
              </div>
            )}
            {message.error && (
              <div className="mt-1 flex items-center gap-1 text-xs text-rose-500">
                <AlertCircle className="h-3 w-3" />
                {message.error.message}
              </div>
            )}
          </>
        )}

        {showActions && (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100",
              (isStreaming && isAssistant) && "opacity-100",
            )}
          >
            {isStreaming && isAssistant && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onStop}
                aria-label="Stop generating"
              >
                <Square className="h-3 w-3 fill-current" />
              </Button>
            )}
            {showCopy && (
              <Button variant="ghost" size="icon-sm" onClick={onCopy} aria-label="Copy">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
            {showEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setDraft(userText);
                  setEditing(true);
                }}
                aria-label="Edit message"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {showRegenerate && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRegenerate}
                aria-label="Regenerate response"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {!isUser && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  // Delete the assistant message (delegated to engine).
                  chat.engine.deleteConversation(chat.conversationId);
                  chat.engine.newConversation();
                }}
                aria-label="Delete from here"
                className="ml-auto"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function UserBody({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {text}
    </div>
  );
}

export const messageBubbleWrapperClass = cn;