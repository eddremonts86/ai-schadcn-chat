import { useState, type ReactElement } from "react";
import { ScrollText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ai-schadcn-chat/components";
import {
  CONFIG_FIELDS,
  CONFIG_SECTIONS,
  TOTAL_FIELDS,
  type ConfigSectionId,
} from "../content/config-reference";
import { ConfigField } from "./ConfigField";

/**
 * Full configuration reference page rendered inline in the landing.
 *
 * Layout:
 *   - Hero: "every knob on <ChatPanel />" with TOTAL_FIELDS stat.
 *   - Tabs: one per ConfigSectionId so the reader can jump by topic.
 *   - Inside each tab: one ConfigField card per documented entry.
 *
 * Anchors on every section id so the SiteNav (scroll-to-anchor) and
 * future deep-links both work without a router.
 */
export function ConfigReference(): ReactElement {
  const [active, setActive] = useState<ConfigSectionId>("provider");

  return (
    <section
      id="config-reference"
      aria-labelledby="config-reference-title"
      className="border-t border-border/60 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <ScrollText className="size-3.5" />
            Configuration reference
          </div>
          <h2
            id="config-reference-title"
            className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Every knob on <code className="font-mono">&lt;ChatPanel /&gt;</code>
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            {TOTAL_FIELDS} documented fields across six sections. Each card explains
            what the field does, what it defaults to, and shows real usage you can
            paste straight into your config.
          </p>
        </div>

        <Tabs
          value={active}
          onValueChange={(v) => setActive(v as ConfigSectionId)}
          className="w-full"
        >
          <div className="sticky top-16 z-10 -mx-4 mb-6 bg-background/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              {CONFIG_SECTIONS.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {section.label}
                  <span className="ml-1.5 rounded-full bg-background/60 px-1.5 py-0 font-mono text-[10px] text-muted-foreground">
                    {CONFIG_FIELDS[section.id].length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {CONFIG_SECTIONS.map((section) => (
            <TabsContent key={section.id} value={section.id} className="mt-0 space-y-6">
              <header className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <h3 className="font-semibold tracking-tight">{section.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{section.blurb}</p>
              </header>

              <div className="space-y-2">
                {CONFIG_FIELDS[section.id].map((field) => (
                  <ConfigField key={field.path} field={field} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <footer className="mt-10 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          Missing a field? Open an issue on{" "}
          <a
            href="https://github.com/eddremonts86/ai-schadcn-chat"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            GitHub
          </a>{" "}
          — this page is generated from <code className="font-mono">src/types/chat.ts</code>{" "}
          so it stays in sync with the public API.
        </footer>
      </div>
    </section>
  );
}