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
import { ChatProvider, useOptionalChat } from "./ChatProvider.js";

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
  /** Extra className on the inner content wrapper of both the message list
   *  and composer (merged over the default `max-w-3xl` via tailwind-merge).
   *  Use this to let the conversation use more horizontal space in wide
   *  layouts, e.g. `contentClassName="max-w-5xl"`. */
  contentClassName?: string;
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
export function ChatPanel(props: ChatPanelProps): ReactNode {
  const {
    config,
    layout = "panel",
    renderHeader,
    renderFooter,
    className,
    contentClassName,
    style,
    hideHeader = false,
    hideComposer = false,
  } = props;

  const containerClasses =
    layout === "floating"
      ? "fixed bottom-5 right-5 z-40 flex w-[min(420px,calc(100vw-2.5rem))] h-[min(660px,calc(100vh-2.5rem))] flex-col overflow-hidden rounded-2xl surface-elevated app-mesh"
      : layout === "fullpage"
        ? "flex h-full w-full flex-col app-mesh"
        : "flex h-full w-full flex-col overflow-hidden rounded-2xl surface-elevated app-mesh";

  // If a parent already provided a ChatProvider (we are nested), use it
  // and skip the internal one — otherwise the form mutates the outer
  // engine but the header/list/composer inside this panel read from the
  // inner engine, and the two would silently diverge. When there's no
  // parent provider we create one so the panel works standalone too.
  const outer = useOptionalChat();
  const tree = (
    <TooltipProvider delayDuration={200}>
      <ChatSurface
        layout={layout}
        className={className}
        style={style}
        renderHeader={renderHeader}
        renderFooter={renderFooter}
        contentClassName={contentClassName}
        hideHeader={hideHeader}
        hideComposer={hideComposer}
      />
    </TooltipProvider>
  );
  if (outer) return tree;
  return <ChatProvider config={config}>{tree}</ChatProvider>;
}

/**
 * ChatSurface — the inner panel tree. Reads `useOptionalChat` so it can
 * apply density/theme/accent/font CSS hooks to its root div based on the
 * active config. Lives in the same file as ChatPanel because it has no
 * value as a standalone component.
 */
function ChatSurface({
  layout,
  className,
  style,
  renderHeader,
  renderFooter,
  contentClassName,
  hideHeader,
  hideComposer,
}: {
  layout: "panel" | "floating" | "fullpage";
  className?: string;
  style?: CSSProperties;
  renderHeader?: () => ReactNode;
  renderFooter?: () => ReactNode;
  contentClassName?: string;
  hideHeader: boolean;
  hideComposer: boolean;
}) {
  const chat = useOptionalChat();
  const ui = chat?.config.ui ?? {};
  const density = ui.density ?? "comfortable";
  const theme = ui.theme ?? "system";
  const accentColor = ui.accentColor ?? "";
  const fontFamily = ui.fontFamily ?? "";

  const containerClasses =
    layout === "floating"
      ? "fixed bottom-5 right-5 z-40 flex w-[min(420px,calc(100vw-2.5rem))] h-[min(660px,calc(100vh-2.5rem))] flex-col overflow-hidden rounded-2xl surface-elevated app-mesh"
      : layout === "fullpage"
        ? "flex h-full w-full flex-col app-mesh"
        : "flex h-full w-full flex-col overflow-hidden rounded-2xl surface-elevated app-mesh";

  const inlineVars: Record<string, string> = {};
  if (accentColor) inlineVars["--chat-accent"] = accentColor;
  if (fontFamily) inlineVars["--chat-font-family"] = fontFamily;

  return (
    <div
      className={cn(containerClasses, className)}
      style={{ ...style, ...inlineVars } as CSSProperties}
      data-density={density}
      data-theme={theme}
    >
      {renderHeader ? (
        renderHeader()
      ) : hideHeader ? null : (
        <ChatHeader />
      )}
      <MessageList contentClassName={contentClassName} />
      {renderFooter ? renderFooter() : null}
      {hideComposer ? null : <ChatComposer contentClassName={contentClassName} />}
    </div>
  );
}
