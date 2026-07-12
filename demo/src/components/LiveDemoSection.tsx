import type { ReactElement } from "react";
import { UnifiedPlayground } from "./UnifiedPlayground";

export function LiveDemoSection(): ReactElement {
  return (
    <section id="live-demo" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Try it live
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            The real <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">&lt;ChatPanel /&gt;</code>{" "}
            on the left. Mutate any of the 72 documented fields in the form on the right and watch the panel react in place.
          </p>
        </div>
        <UnifiedPlayground />
      </div>
    </section>
  );
}