/**
 * MessageList — replaces the previous TanStack-Virtual list with the
 * official `MessageScroller` primitives from the shadcn-ui repo (radix-rhea
 * style). Each row is a `MessageItem` that composes `Message` + `Bubble`
 * (+ `Attachment`, `Marker`, `MessageFooter`).
 *
 * Performance: long threads stay fast because the radix-rhea viewport
 * sets `content-visibility: auto` and a 10rem `contain-intrinsic-size` on
 * each `MessageScrollerItem`, so off-screen rows do not paint.
 */
import {
  useChat,
} from "../../hooks/useChat.js";
import {
  AlertTriangle,
  Check,
  Loader2,
  Wrench,
} from "lucide-react";
import {
  Bubble,
  BubbleContent,
} from "./Chatbubble.js";
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
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "./MessageMarker.js";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "./Attachment.js";
import { cn } from "../../lib/utils.js";
import type { ChatMessage, Role } from "../../types/chat.js";
import { formatBytes } from "../../lib/utils.js";
import { FileText, User } from "lucide-react";

export interface MessageListProps {
  className?: string;
}

export function MessageList({ className }: MessageListProps) {
  const chat = useChat();
  const cfg = chat.config;
  const messages = chat.messages;

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className={cn("flex-1", className)}>
        {messages.length === 0 ? (
          <MessageScrollerViewport>
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {(cfg.ui?.emptyState as React.ReactNode) ??
                    "Start a conversation"}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Powered by <span className="font-mono">{cfg.model.id}</span>
                  {cfg.model.provider && cfg.model.provider !== cfg.provider.kind
                    ? ` via ${cfg.model.provider}`
                    : ` · ${cfg.provider.kind}`}
                </p>
              </div>
            </div>
          </MessageScrollerViewport>
        ) : (
          <MessageScrollerViewport>
            <MessageScrollerContent>
              {messages.map((msg, idx) => (
                <MessageScrollerItem
                  key={msg.id}
                  id={msg.id}
                  scrollAnchor={idx === messages.length - 1}
                >
                  <MessageItem
                    message={msg}
                    isStreaming={
                      chat.isStreaming && idx === messages.length - 1
                    }
                  />
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        )}
        <MessageScrollerButton direction="end" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

interface MessageItemProps {
  message: ChatMessage;
  isStreaming: boolean;
}

function MessageItem({ message, isStreaming }: MessageItemProps) {
  const align: "start" | "end" = message.role === "user" ? "end" : "start";
  const variant = bubbleVariantForRole(message.role, message.status);

  return (
    <Message align={align}>
      <MessageAvatar>
        <AvatarFor role={message.role} />
      </MessageAvatar>
      <MessageContent>
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentGroup>
            {message.attachments.map((att) => (
              <Attachment key={att.id} size="sm" state="done">
                <AttachmentMedia>
                  <FileText className="h-4 w-4" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{att.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {formatBytes(att.size)}
                    {att.mime ? ` · ${att.mime}` : ""}
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            ))}
          </AttachmentGroup>
        )}
        <Bubble variant={variant} align={align}>
          <BubbleContent>
            <MessageBody message={message} />
            {message.status === "streaming" && (
              <span className="ml-1 inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-current align-baseline" />
            )}
          </BubbleContent>
        </Bubble>

        {/* Tool calls render as Markers (separators). */}
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

        {message.status === "error" && (
          <Bubble variant="destructive" align={align}>
            <BubbleContent>
              <span className="font-mono text-xs">
                {(message.error?.code ?? "error") + ": "}
              </span>
              {message.error?.message ?? "Something went wrong."}
            </BubbleContent>
          </Bubble>
        )}

        {isStreaming && (
          <MessageFooter>
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating…
            </span>
          </MessageFooter>
        )}

        {message.role === "tool" && message.name && (
          <MessageFooter>
            <span className="inline-flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              tool · <span className="font-mono">{message.name}</span>
            </span>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}

function MessageBody({ message }: { message: ChatMessage }) {
  // Tool messages render their payload as a small monospace block.
  if (message.role === "tool") {
    return (
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
        {truncate(message.content, 1200)}
      </pre>
    );
  }
  // Plain-text content for user / assistant. Markdown rendering is left to
  // the consumer — the radix-rhea Message component is intentionally text-
  // agnostic so it can be wrapped with any markdown layer.
  return <span className="whitespace-pre-wrap">{message.content}</span>;
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
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <User className="h-4 w-4" />
      </div>
    );
  }
  if (role === "assistant") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
        AI
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Wrench className="h-4 w-4" />
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}