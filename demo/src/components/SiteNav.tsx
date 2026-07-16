import { GithubIcon, Menu, Package, Sparkles } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@edd_remonts/ai-schadcn-chat/components";
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
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <a href={NPM_URL} target="_blank" rel="noreferrer" aria-label="View on npm">
              <Package className="size-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="View on GitHub">
              <GithubIcon className="size-4" />
            </a>
          </Button>
          <Button size="sm" onClick={() => scrollToId("live-demo")} className="gap-1.5">
            Try it live
          </Button>

          {/* Mobile: nav links + npm/GitHub collapse into one menu. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Open menu"
                className="text-muted-foreground hover:text-foreground sm:hidden"
              >
                <Menu className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {NAV_LINKS.map((link) => (
                <DropdownMenuItem key={link.targetId} onClick={() => scrollToId(link.targetId)}>
                  {link.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <a href={NPM_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                  <Package className="size-3.5" /> npm
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                  <GithubIcon className="size-3.5" /> GitHub
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

