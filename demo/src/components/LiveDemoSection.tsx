import { ChatPanel } from "ai-schadcn-chat";
import type { ChatConfig } from "ai-schadcn-chat";

export function LiveDemoSection({ config }: { config: ChatConfig }) {
  return (
    <section id="live-demo" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Try it live
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            This is the real{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              &lt;ChatPanel /&gt;
            </code>{" "}
            component, wired to MiniMax through the OpenAI-compatible protocol — not a screenshot.
          </p>
        </div>

        <div className="h-[min(680px,80dvh)] w-full">
          <ChatPanel config={config} layout="panel" className="shadow-2xl" />
        </div>
      </div>
    </section>
  );
}
