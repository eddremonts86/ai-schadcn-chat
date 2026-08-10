import { Check, Copy } from "lucide";
import { ArrowUpRight } from "lucide-react";
import { useState, type ReactElement } from "react";
import { Markdown } from "@edd_remonts/ai-schadcn-chat/components";
import { cn } from "@edd_remonts/ai-schadcn-chat/lib";
import { HERO_CONTENT, INSTALL_COMMAND, QUICK_START_SNIPPET, REPO_URL } from "../content/site";
import { useScrollToId } from "../hooks/useScrollToId";
import { Morph } from "./MorphIcon";

/** Provider names from HERO_CONTENT.providersLine, for the stat card below
 * the fold — real count, not a decorative number. */
const PROVIDER_COUNT = HERO_CONTENT.providersLine.split("·").length;

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
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
        <div className="text-center lg:text-left">
          <h1 className="text-balance font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
            {HERO_CONTENT.headline}
          </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg lg:mx-0">
              {HERO_CONTENT.subheadline}
            </p>

            <p className="mx-auto mt-4 max-w-xl text-pretty text-xs text-muted-foreground/70 sm:text-sm lg:mx-0">
              {HERO_CONTENT.providersLine}
            </p>

            <button
              type="button"
              onClick={copyInstall}
              className="group mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-border/70 bg-card/60 px-5 py-2.5 font-mono text-sm text-foreground/90 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
            >
              <span>{INSTALL_COMMAND}</span>
              <Morph
                icon={copied ? Check : Copy}
                className={cn(
                  "size-3.5 shrink-0 transition-colors",
                  copied
                    ? "text-success"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
            </button>

            <div className="mt-7 flex flex-col items-center gap-5 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                View on GitHub
                <ArrowUpRight className="size-4" />
              </a>

              <SpinBadge onClick={() => scrollToId("live-demo")} />
            </div>

            <div className="mx-auto mt-8 inline-flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 lg:mx-0">
              <div className="flex -space-x-1.5" aria-hidden>
                <span className="size-6 rounded-full border-2 border-card bg-primary" />
                <span className="size-6 rounded-full border-2 border-card bg-foreground/80" />
                <span className="size-6 rounded-full border-2 border-card bg-muted-foreground/60" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">{PROVIDER_COUNT} providers, one API</p>
                <p className="text-xs text-muted-foreground">Anthropic · OpenAI · MiniMax + {PROVIDER_COUNT - 3} more</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <span aria-hidden className="blob-accent absolute -right-6 -top-10 -z-10 hidden size-48 sm:block sm:size-56" />
            <div className="surface-elevated overflow-hidden rounded-tl-[2.5rem] rounded-br-[2.5rem] rounded-tr-2xl rounded-bl-2xl sm:-rotate-1">
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
        </div>
    </section>
  );
}
/**
 * Circular rotating-text badge — the hero's signature element. Curved text
 * loops around an SVG path (no JS layout math); only the outer <svg> spins,
 * so the center arrow stays upright. Pauses under prefers-reduced-motion
 * instead of removing the affordance.
 */
function SpinBadge({ onClick }: { onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Try it live — scroll to the demo"
      className="group relative grid size-28 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:size-32"
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        className="absolute inset-0 size-full animate-[spin_16s_linear_infinite] motion-reduce:animate-none"
      >
        <path id="spin-badge-path" fill="none" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        <text className="fill-muted-foreground text-[9px] font-mono uppercase tracking-[0.25em]">
          <textPath href="#spin-badge-path" startOffset="0%">
            Try it live • Try it live • Try it live •
          </textPath>
        </text>
      </svg>
      <span className="grid size-12 place-items-center rounded-full bg-foreground text-background shadow-md transition-transform group-hover:scale-105 motion-reduce:transition-none sm:size-14">
        <ArrowUpRight className="size-5 sm:size-6" />
      </span>
    </button>
  );
}

