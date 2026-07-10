import { GithubIcon, Package, Sparkles } from "lucide-react";
import { Button } from "ai-schadcn-chat/components";
import { NAV_LINKS, NPM_URL, REPO_URL } from "../content/site";
import { useScrollToId } from "../hooks/useScrollToId";

export function SiteNav() {
  const scrollToId = useScrollToId();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg grad-primary text-primary-foreground shadow-sm glow-primary">
            <Sparkles className="size-4" />
          </span>
          ai-schadcn-chat
        </a>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.targetId}
              type="button"
              onClick={() => scrollToId(link.targetId)}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <a href={NPM_URL} target="_blank" rel="noreferrer" aria-label="View on npm">
              <Package className="size-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="View on GitHub">
              <GithubIcon className="size-4" />
            </a>
          </Button>
          <Button size="sm" onClick={() => scrollToId("live-demo")} className="gap-1.5">
            Try it live
          </Button>
        </div>
      </div>
    </header>
  );
}
