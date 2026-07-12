/**
 * MessageList — the scrolling conversation surface.
 *
 * Built on the radix-rhea `MessageScroller` primitives (off-screen rows use
 * `content-visibility: auto` so long threads stay fast). Each row composes an
 * avatar + bubble; assistant/tool content renders as rich Markdown with
 * highlighted code, while user content stays plain text. Empty threads show a
 * welcome screen with quick-start suggestions.
 */
import {
  AlertTriangle,
  ArrowDown,
  Bot,
  Check,
  Clock,
  Copy,
  Gauge,
  Hash,
  KeyRound,
  Loader2,
  type LucideIcon,
  Pencil,
  RotateCcw,
  ServerCrash,
  Sparkles,
  Trash2,
  User,
  WifiOff,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useChat } from "../../hooks/useChat.js";
import { Bubble, BubbleContent } from "./Chatbubble.js";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "./Message.js";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "./MessageScroller.js";
import { Marker, MarkerContent, MarkerIcon } from "./MessageMarker.js";
import { AttachmentPreview } from "./AttachmentPreview.js";
import { Button } from "../ui/button.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.js";
import { Markdown } from "./Markdown.js";
import { useOptionalChat } from "./ChatProvider.js";
import { ReasoningPanel, splitReasoning } from "./ReasoningPanel.js";
import { Textarea } from "../ui/input.js";
import { extractMessageText } from "../../lib/attachments.js";
import { cn, estimateTokens } from "../../lib/utils.js";
import type { ChatError, ChatMessage, Role } from "../../types/chat.js";

export interface MessageListProps {
  className?: string;
  /** Extra className on the inner content wrapper, merged over the default
   *  `max-w-3xl` via tailwind-merge. Use this to let the conversation use
   *  more horizontal space in wide layouts. */
  contentClassName?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Explain a tricky concept simply",
  "Write and review a code snippet",
  "Brainstorm ideas with me",
  "Summarize a long document",
];

export function MessageList({ className, contentClassName }: MessageListProps) {
  const chat = useChat();
  const messages = chat.messages;

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className={cn("relative flex-1", className)}>
        {messages.length === 0 ? (
          <MessageScrollerViewport>
            <WelcomeScreen />
          </MessageScrollerViewport>
        ) : (
          <MessageScrollerViewport>
            <MessageScrollerContent className={cn("mx-auto w-full max-w-3xl gap-5 px-3 py-6 sm:px-5", contentClassName)}>
              {messages.map((msg, idx) => (
                <MessageScrollerItem
                  key={msg.id}
                  id={msg.id}
                  scrollAnchor={idx === messages.length - 1}
                >
                  <MessageItem
                    message={msg}
                    isStreaming={chat.isStreaming && idx === messages.length - 1}
                  />
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        )}
        <MessageScrollerButton
          direction="end"
          className="size-9 rounded-full surface-elevated text-foreground/80 backdrop-blur"
        >
          <ArrowDown className="size-4" />
        </MessageScrollerButton>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function WelcomeScreen() {
  const chat = useChat();
  const cfg = chat.config;
  const ui = cfg.ui ?? {};

  const greeting = ui.greeting ?? "How can I help you today?";
  const suggestions = ui.suggestions ?? DEFAULT_SUGGESTIONS;

  if (ui.emptyState) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        {ui.emptyState as React.ReactNode}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
      <div className="animate-message-in relative mb-6 grid size-16 place-items-center rounded-2xl grad-primary text-primary-foreground glow-primary-strong">
        <Sparkles className="size-7" />
        <span className="ring-conic absolute -inset-px -z-10 rounded-2xl opacity-40 blur-md" />
      </div>
      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {greeting}
      </h2>
      <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
        Ask anything, or start with one of these. Powered by{" "}
        <span className="font-medium text-foreground">
          {cfg.model.label ?? cfg.model.id}
        </span>
        .
      </p>

      <div className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            onClick={() => void chat.send(s)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-message-in group h-auto justify-start gap-3 whitespace-normal rounded-xl border-border/70 bg-card/60 px-4 py-3 text-left text-sm font-normal transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-[0_8px_24px_-12px_oklch(var(--glow)/0.4)]"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-pretty text-foreground/90">{s}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

interface MessageItemProps {
  message: ChatMessage;
  isStreaming: boolean;
}

function MessageItem({ message, isStreaming }: MessageItemProps) {
  const chat = useChat();
  const cfg = chat.config;
  const ui = cfg.ui ?? {};
  const [editing, setEditing] = useState(false);
  const isError = message.status === "error";
  // Errors are system feedback — always render them on the assistant (left)
  // side with the error card, never as a right-aligned user bubble.
  const align: "start" | "end" =
    !isError && message.role === "user" ? "end" : "start";
  const isUser = !isError && message.role === "user";
  const variant = bubbleVariantForRole(message.role, message.status);
  // User turns with attachments store an `ai-chat-blocks` JSON marker as
  // content; surface only the typed text (images render as chips above).
  const raw = isUser ? extractMessageText(message.content) : message.content;
  // Separate the model's reasoning (structured `reasoning` field + inline
  // <think> tags) from the visible answer.
  const { think, answer } = isUser
    ? { think: "", answer: raw }
    : splitReasoning(raw);
  const reasoning = isUser
    ? ""
    : [message.reasoning, think].filter(Boolean).join("\n").trim();
  const displayText = isUser ? raw : answer;
  const showThinking =
    message.status === "streaming" &&
    displayText.trim().length === 0 &&
    reasoning.length === 0;

  return (
    <Message align={align} className="animate-message-in">
      {!isUser && (
        <MessageAvatar className="bg-transparent">
          <AvatarFor role={isError ? "assistant" : message.role} />
        </MessageAvatar>
      )}
      <MessageContent>
        {message.attachments && message.attachments.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-2",
              align === "end" && "justify-end",
            )}
          >
            {message.attachments.map((att) => (
              <AttachmentPreview key={att.id} att={att} />
            ))}
          </div>
        )}

        {reasoning.length > 0 && (
          <ReasoningPanel
            reasoning={reasoning}
            active={message.status === "streaming"}
          />
        )}

        {editing ? (
          <MessageEditor
            initial={displayText}
            onCancel={() => setEditing(false)}
            onSave={(next) => {
              setEditing(false);
              if (next.trim() && next.trim() !== displayText.trim()) {
                void chat.editAndResend(message.id, next.trim());
              }
            }}
          />
        ) : (
          (displayText.trim().length > 0 || showThinking) && (
            <Bubble variant={variant} align={align}>
              <BubbleContent
                className={cn(isUser ? "surface-tinted text-foreground" : "surface-elevated")}
              >
                {showThinking ? (
                  <ThinkingDots />
                ) : (
                  <MessageBody message={message} isUser={isUser} text={displayText} />
                )}
                {message.status === "streaming" && !showThinking && (
                  <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-current align-text-bottom" />
                )}
              </BubbleContent>
            </Bubble>
          )
        )}

        {/* Tool calls render as Markers. */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.toolCalls.map((tc) => (
              <Marker key={tc.id} variant="default">
                <MarkerIcon>
                  {tc.status === "error" ? (
                    <AlertTriangle />
                  ) : tc.status === "complete" ? (
                    <Check />
                  ) : (
                    <Loader2 className="animate-spin" />
                  )}
                </MarkerIcon>
                <MarkerContent>
                  <span className="font-mono">{tc.name}</span>
                  {tc.status === "error"
                    ? " failed"
                    : tc.status === "complete"
                      ? ""
                      : " …"}
                </MarkerContent>
              </Marker>
            ))}
          </div>
        )}

        {isError && (
          <div className="self-start">
            <ErrorCard error={message.error} onRetry={() => void chat.regenerate()} />
          </div>
        )}

        {/* Generation stats (assistant, completed). */}
        {!isUser && message.status === "complete" && (
          <MessageStats message={message} answer={displayText} />
        )}

        {/* Hover actions + timestamp. */}
        {!editing && !showThinking && displayText.trim().length > 0 && (
          <MessageActions
            message={message}
            copyText={displayText}
            align={align}
            isUser={isUser}
            showTimestamp={ui.showTimestamps ?? true}
            onEdit={isUser ? () => setEditing(true) : undefined}
            onDelete={() => chat.deleteMessage(message.id)}
          />
        )}

        {isStreaming && !showThinking && (
          <MessageFooter>
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Loader2 className="size-3 animate-spin" />
              Generating…
            </span>
          </MessageFooter>
        )}

        {message.role === "tool" && message.name && (
          <MessageFooter>
            <span className="inline-flex items-center gap-1">
              <Wrench className="size-3" />
              tool · <span className="font-mono">{message.name}</span>
            </span>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}

function MessageActions({
  message,
  copyText,
  align,
  isUser,
  showTimestamp,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  copyText: string;
  align: "start" | "end";
  isUser: boolean;
  showTimestamp: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const chat = useChat();
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const btn = "size-7 text-muted-foreground hover:bg-foreground/10 hover:text-foreground";

  return (
    <MessageFooter
      className={cn(
        "w-fit gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/message:opacity-100",
        align === "end" && "flex-row-reverse self-end",
      )}
    >
      <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label="Copy message" className={btn}>
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </Button>
      {isAssistant && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => void chat.regenerate()} aria-label="Regenerate response" className={btn}>
          <RotateCcw className="size-3.5" />
        </Button>
      )}
      {isUser && onEdit && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit message" className={btn}>
          <Pencil className="size-3.5" />
        </Button>
      )}
      {onDelete && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete message" className="size-7 text-muted-foreground hover:bg-foreground/10 hover:text-destructive">
          <Trash2 className="size-3.5" />
        </Button>
      )}
      {showTimestamp && (
        <span className="px-1.5 text-[11px] tabular-nums text-muted-foreground/70">
          {formatTime(message.createdAt)}
        </span>
      )}
    </MessageFooter>
  );
}

function MessageStats({
  message,
  answer,
}: {
  message: ChatMessage;
  answer: string;
}) {
  const tokens = message.usage?.completionTokens ?? estimateTokens(answer);
  const durMs =
    message.startedAt && message.completedAt
      ? message.completedAt - message.startedAt
      : undefined;
  const secs = durMs ? durMs / 1000 : undefined;
  const tps = tokens && secs && secs > 0 ? tokens / secs : undefined;
  if (!tokens && !secs && !message.model) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 text-[11px] text-muted-foreground/70">
      {message.model && (
        <span
          className="inline-flex items-center gap-1"
          title={`Generated by ${message.model}`}
        >
          <Bot className="size-3" />
          {message.model}
        </span>
      )}
      {tps !== undefined && (
        <span className="inline-flex items-center gap-1">
          <Gauge className="size-3" />
          {tps.toFixed(1)} tok/s
        </span>
      )}
      {tokens > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Hash className="size-3" />
          {tokens} tokens
        </span>
      )}
      {secs !== undefined && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Clock className="size-3" />
          {secs.toFixed(2)}s
        </span>
      )}
    </div>
  );
}

function MessageEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (next: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="w-full max-w-[80%] self-end">
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSave(value);
          }
          if (e.key === "Escape") onCancel();
        }}
        className="min-h-16 w-full resize-y rounded-2xl surface-tinted text-sm text-foreground"
      />
      <div className="mt-1.5 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => onSave(value)} className="gap-1.5">
          <Check className="size-3.5" />
          Save &amp; resend
        </Button>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span
      className="flex items-center gap-1 py-1"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-primary"
          style={{
            animation: "typing-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}

function MessageBody({
  message,
  isUser,
  text,
}: {
  message: ChatMessage;
  isUser: boolean;
  text: string;
}) {
  // Pull the active config (if any) so markdown can pick up the per-chat
  // typeset styling without changing this component's prop signature.
  // useOptionalChat returns null when the MessageList renders outside a
  // ChatProvider (e.g. in tests) — we fall back to the legacy look in that case.
  const chatCtx = useOptionalChat();
  const typeset = chatCtx?.config.ui?.typeset;
  if (message.role === "tool") {
    return (
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
        {truncate(text, 1200)}
      </pre>
    );
  }
  if (isUser) {
    return <span className="whitespace-pre-wrap break-words">{text}</span>;
  }
  return <Markdown typeset={typeset}>{text}</Markdown>;
}

function humanizeError(error?: ChatError): {
  title: string;
  body: string;
  Icon: LucideIcon;
} {
  switch (error?.code) {
    case "rate_limit":
      return {
        title: "You've hit the rate limit",
        body: "This model's plan is out of quota right now. Wait a moment and try again, or upgrade your plan for more usage.",
        Icon: Gauge,
      };
    case "auth":
      return {
        title: "Couldn't authenticate",
        body: "The API key was rejected. Double-check that it's correct and has access to this model.",
        Icon: KeyRound,
      };
    case "network":
      return {
        title: "Connection problem",
        body: "I couldn't reach the model. Check your internet connection and try again.",
        Icon: WifiOff,
      };
    case "server":
      return {
        title: "The model service had a problem",
        body: "The provider returned an error. This is usually temporary — try again in a moment.",
        Icon: ServerCrash,
      };
    case "context_overflow":
      return {
        title: "This conversation got too long",
        body: "It exceeded the model's context window. Start a new chat or remove some earlier messages.",
        Icon: AlertTriangle,
      };
    case "aborted":
      return {
        title: "Generation stopped",
        body: "You stopped this response. Send again to retry.",
        Icon: AlertTriangle,
      };
    case "parse":
      return {
        title: "I couldn't read the reply",
        body: "The model's response came back malformed. Trying again usually fixes it.",
        Icon: AlertTriangle,
      };
    default:
      return {
        title: "Something went wrong",
        body: "An unexpected error stopped this response. Let's try again.",
        Icon: AlertTriangle,
      };
  }
}

function ErrorCard({
  error,
  onRetry,
}: {
  error?: ChatError;
  onRetry: () => void;
}) {
  const { title, body, Icon } = humanizeError(error);
  const technical = error?.message?.trim();

  return (
    <div className="w-fit max-w-[85%] rounded-3xl surface-elevated p-3 text-sm">
      <div className="flex gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-destructive">{title}</p>
          <p className="mt-0.5 text-pretty text-muted-foreground">{body}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onRetry}
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              <RotateCcw className="size-3.5" />
              Try again
            </Button>
            {technical && (
              <Collapsible className="min-w-0">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-lg px-2 text-xs font-normal text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  >
                    <AlertTriangle className="size-3" />
                    Technical details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted/60 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {error?.code
                      ? `${error.code}${error.status ? ` · ${error.status}` : ""}\n`
                      : ""}
                    {technical}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function bubbleVariantForRole(
  role: Role,
  status: ChatMessage["status"],
): "default" | "secondary" | "muted" | "destructive" {
  if (status === "error") return "destructive";
  if (role === "user") return "default";
  if (role === "assistant") return "secondary";
  return "muted";
}

function AvatarFor({ role }: { role: Role }) {
  if (role === "user") {
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border/70">
        <User className="size-4" />
      </div>
    );
  }
  if (role === "assistant") {
    return (
      <div className="flex size-8 items-center justify-center rounded-full grad-primary text-primary-foreground shadow-sm glow-primary">
        <Sparkles className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Wrench className="size-4" />
    </div>
  );
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
