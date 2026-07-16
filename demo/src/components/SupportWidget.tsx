import { MessageCircle, X } from "lucide-react";
import { ChatPanel } from "@edd_remonts/ai-schadcn-chat";
import type { ChatConfig } from "@edd_remonts/ai-schadcn-chat";
import { Button } from "@edd_remonts/ai-schadcn-chat/components";
import { cn } from "@edd_remonts/ai-schadcn-chat/lib";
import { useChatWidget } from "../hooks/useChatWidget";

/**
 * Site-wide "get support" bubble: a floating action button that expands
 * into a compact ChatPanel, styled like a docs/support widget rather than
 * the full chat surface used in the live-demo section. Swap `config` for
 * any persona — this component owns only the open/close chrome.
 */
export function SupportWidget({ config }: { config: ChatConfig }) {
  const widget = useChatWidget();

  return (
    <>
      {widget.isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-5 z-40 flex h-[min(640px,calc(100vh-8rem))] w-[min(460px,calc(100vw-2.5rem))]",
            "flex-col overflow-hidden rounded-2xl surface-elevated app-mesh shadow-2xl animate-message-in",
          )}
        >
          <ChatPanel
            config={config}
            layout="fullpage"
            className="h-full w-full"
            renderHeader={() => (
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-lg grad-primary text-primary-foreground">
                    <MessageCircle className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-none tracking-tight">
                      Ask about this library
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ai-schadcn-chat docs guide
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={widget.close}
                  aria-label="Close"
                  className="rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
          />
        </div>
      )}

      <Button
        type="button"
        onClick={widget.toggle}
        aria-label={widget.isOpen ? "Close support chat" : "Ask about this library"}
        className="fixed bottom-5 right-5 z-40 size-14 rounded-full p-0 shadow-2xl transition-transform glow-primary-strong hover:scale-105"
      >
        {widget.isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </>
  );
}
