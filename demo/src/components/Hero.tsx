import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "ai-schadcn-chat/components";
import { HERO_CONTENT, INSTALL_COMMAND, REPO_URL } from "../content/site";
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
    <section id="top" className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <Badge
          variant="secondary"
          className="mb-6 gap-1.5 px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground"
        >
          {HERO_CONTENT.eyebrow}
        </Badge>

        <h1 className="text-balance text-4xl font-semibold tracking-tighter sm:text-6xl">
          {HERO_CONTENT.headline}
        </h1>

        <p className="mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {HERO_CONTENT.subheadline}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {HERO_CONTENT.providers.map((provider) => (
            <Badge key={provider} variant="outline" className="text-xs font-normal text-muted-foreground">
              {provider}
            </Badge>
          ))}
        </div>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={copyInstall}
            className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 font-mono text-sm text-foreground/90 transition-colors hover:border-primary/40"
          >
            <span>{INSTALL_COMMAND}</span>
            {copied ? (
              <Check className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <Button onClick={() => scrollToId("live-demo")} className="gap-1.5">
              Try it live
            </Button>
            <Button variant="outline" asChild>
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
