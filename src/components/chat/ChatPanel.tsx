/**
 * The full chat panel — header + virtualized message list + composer.
 * Drop this into any layout and you get a complete chat experience.
 */
import type { CSSProperties, ReactNode } from "react";
import { TooltipProvider } from "../ui/tooltip.js";
import { ChatHeader } from "./ChatHeader.js";
import { ChatComposer } from "./ChatComposer.js";
import { MessageList } from "./MessageList.js";
import { cn } from "../../lib/utils.js";
import type { ChatConfig } from "../../types/chat.js";
import { ChatProvider } from "./ChatProvider.js";

export interface ChatPanelProps {
  /** Inline config. Mutate at runtime via `useChat().updateConfig`. */
  config: ChatConfig;
  /** Layout. `panel` (default) is a card; `floating` is a fixed corner widget. */
  layout?: "panel" | "floating" | "fullpage";
  /** Override the default header render. */
  renderHeader?: () => ReactNode;
  /** Override the default footer render (above the composer). */
  renderFooter?: () => ReactNode;
  /** Extra className on the outer container. */
  className?: string;
  /** Extra style. */
  style?: CSSProperties;
  /** Hide the header entirely. */
  hideHeader?: boolean;
  /** Hide the composer entirely (render a read-only viewer). */
  hideComposer?: boolean;
}

/**
 * One-shot: ChatProvider + TooltipProvider + layout shell + Header +
 * MessageList + Composer. For full control, compose the primitives
 * yourself and only wrap with <ChatProvider config={…} />.
 */
export function ChatPanel(props: ChatPanelProps) {
  const {
    config,
    layout = "panel",
    renderHeader,
    renderFooter,
    className,
    style,
    hideHeader = false,
    hideComposer = false,
  } = props;

  const containerClasses =
    layout === "floating"
      ? "fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-2rem))] rounded-2xl border bg-background shadow-2xl"
      : layout === "fullpage"
      ? "flex h-full w-full flex-col bg-background"
      : "flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background";

  return (
    <ChatProvider config={config}>
      <TooltipProvider delayDuration={200}>
        <div className={cn(containerClasses, className)} style={style}>
          {renderHeader ? (
            renderHeader()
          ) : hideHeader ? null : (
            <ChatHeader />
          )}
          <MessageList />
          {renderFooter ? renderFooter() : null}
          {hideComposer ? null : <ChatComposer />}
        </div>
      </TooltipProvider>
    </ChatProvider>
  );
}