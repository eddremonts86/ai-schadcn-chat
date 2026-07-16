import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button, Markdown } from "@edd_remonts/ai-schadcn-chat/components";
import { HERO_CONTENT, INSTALL_COMMAND, QUICK_START_SNIPPET, REPO_URL } from "../content/site";
import { useScrollToId } from "../hooks/useScrollToId";

export function Hero() {
  const scrollToId = useScrollToId();
  const [copied, setCopied] = useState(false);

  const copyInstall = () => {
    try {
      void navigator.clipboard?.writeText(INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — non-critical */
    }
  };

  return (
    <section id="top" className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="text-center lg:text-left">
          <h1 className="text-balance text-4xl font-semibold tracking-tighter sm:text-5xl lg:text-[3.25rem]">
            {HERO_CONTENT.headline}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg lg:mx-0">
            {HERO_CONTENT.subheadline}
          </p>

          <p className="mx-auto mt-4 max-w-xl text-pretty text-xs text-muted-foreground/70 sm:text-sm lg:mx-0">
            {HERO_CONTENT.providersLine}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
            <button
              type="button"
              onClick={copyInstall}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 font-mono text-sm text-foreground/90 transition-colors hover:border-primary/40 sm:w-auto"
            >
              <span>{INSTALL_COMMAND}</span>
              {copied ? (
                <Check className="size-3.5 shrink-0 text-success" />
              ) : (
                <Copy className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              )}
            </button>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button onClick={() => scrollToId("live-demo")} className="flex-1 gap-1.5 sm:flex-none">
                Try it live
              </Button>
              <Button variant="outline" asChild className="flex-1 sm:flex-none">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="surface-elevated overflow-hidden rounded-2xl">
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/40 px-4 py-3">
            <span className="size-2.5 rounded-full bg-destructive/70" />
            <span className="size-2.5 rounded-full bg-[oklch(0.75_0.15_70)]" />
            <span className="size-2.5 rounded-full bg-success/70" />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">App.tsx</span>
          </div>
          <div className="overflow-x-auto p-4 text-xs sm:p-5 sm:text-[13px]">
            <Markdown>{QUICK_START_SNIPPET}</Markdown>
          </div>
        </div>
      </div>
    </section>
  );
}

