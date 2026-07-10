import { GithubIcon, Package } from "lucide-react";
import { NPM_URL, REPO_URL } from "../content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <p>MIT License · ai-schadcn-chat</p>
        <div className="flex items-center gap-4">
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Package className="size-3.5" /> npm
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <GithubIcon className="size-3.5" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
