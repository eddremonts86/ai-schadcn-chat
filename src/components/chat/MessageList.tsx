/**
 * Message list. Uses @tanstack/react-virtual to keep scrolling smooth
 * for long conversations. Auto-scrolls to the bottom on new content
 * (unless the user has scrolled up to read history).
 */
import { useEffect, useRef, type ReactNode, type UIEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useChat } from "../../hooks/useChat.js";
import { MessageBubble } from "./MessageBubble.js";
import { cn } from "../../lib/utils.js";

export interface MessageListProps {
  className?: string;
}

export function MessageList({ className }: MessageListProps) {
  const chat = useChat();
  const cfg = chat.config;
  const messages = chat.messages;
  const parentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // Detect manual scroll: if the user scrolls up, disable auto-scroll.
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 80;
  };

  // Auto-scroll to the bottom when new content arrives (if user is pinned).
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
  }, [messages.length, virtualizer]);

  // Note: dynamic measurement is handled by the `measureElement` callback
  // passed to useVirtualizer above. Calling `virtualizer.measure()` from a
  // layout effect creates an infinite update loop (measure → setState →
  // re-render → effect → measure...) so we deliberately omit that hook.

  if (messages.length === 0) {
    return (
      <div
        ref={parentRef}
        className={cn(
          "flex flex-1 items-center justify-center p-8 text-center",
          className,
        )}
      >
        <div className="max-w-md space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {cfg.ui?.emptyState as React.ReactNode ?? "Start a conversation"}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Powered by{" "}
            <span className="font-mono">{cfg.model.id}</span>
            {cfg.model.provider && cfg.model.provider !== cfg.provider.kind
              ? ` via ${cfg.model.provider}`
              : ` · ${cfg.provider.kind}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className={cn("flex-1 overflow-y-auto", className)}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const msg = messages[virtualRow.index];
          const isLast = virtualRow.index === messages.length - 1;
          const isStreaming = chat.isStreaming && isLast;
          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageBubble
                message={msg}
                isStreaming={isStreaming}
                isLast={isLast}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}