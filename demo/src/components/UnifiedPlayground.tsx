import type { ReactElement } from "react";
import { ChatPanel } from "ai-schadcn-chat";
import type { ChatConfig } from "ai-schadcn-chat";
import { buildCodingBuddyConfig } from "../lib/chat-configs";

/**
 * Single live chat panel + a right-hand config form (filled in later tasks).
 * Starts from the Coding Buddy persona so the default experience matches
 * what shipped in the prior session's LiveDemoSection.
 *
 * The form on the right will mutate this config via useChat().updateConfig
 * once Task 3 lands; for now it is a placeholder so we can validate the
 * two-column layout in isolation.
 */
export function UnifiedPlayground(): ReactElement {
  const baseConfig: ChatConfig = buildCodingBuddyConfig();
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="h-[min(760px,80dvh)] w-full">
        <ChatPanel config={baseConfig} layout="panel" className="shadow-2xl" />
      </div>
      <aside
        aria-label="Configuration form"
        className="hidden h-[min(760px,80dvh)] overflow-y-auto rounded-2xl border border-border/60 bg-card/40 p-4 lg:block"
      >
        <p className="text-sm text-muted-foreground">Form goes here.</p>
      </aside>
    </div>
  );
}