import { useMemo, type ReactElement } from "react";
import { minimaxApiKey, minimaxBaseUrl } from "./lib/env";
import { buildSupportWidgetConfig, usingChromeFallback } from "./lib/chat-configs";
import { useMiniMaxProviderSync } from "./hooks/useMiniMaxProviderSync";
import { ChromeFallbackNotice } from "./components/ChromeFallbackNotice";
import { SiteNav } from "./components/SiteNav";
import { Hero } from "./components/Hero";
import { FeatureGrid } from "./components/FeatureGrid";
import { LiveDemoSection } from "./components/LiveDemoSection";
import { ConfigReferenceSection } from "./components/ConfigReferenceSection";
import { SiteFooter } from "./components/SiteFooter";
import { SupportWidget } from "./components/SupportWidget";

/**
 * Landing page for the ai-schadcn-chat npm package. Two personas run against
 * the same MiniMax deployment (see lib/chat-configs.ts):
 *
 *  • "Coding buddy" — the real <ChatPanel /> rendered inline in #live-demo,
 *    with a side-by-side form that mutates all 72 documented config fields.
 *  • "Docs guide" — behind the floating support bubble bottom-right.
 *
 * Below the playground, the #config-reference section renders the full
 * ConfigReference doc grid: one collapsible card per field with description,
 * notes, and a copy-able example. The playground and the doc grid are
 * siblings — the playground is the "touch it" surface, the doc grid is the
 * "read what each knob does" surface.
 *
 * All env wiring, provider-manager syncing, and config building live in
 * lib/ + hooks/ so this file stays a plain composition root.
 */
export default function App(): ReactElement {
  const apiKey = minimaxApiKey();
  useMiniMaxProviderSync(apiKey, minimaxBaseUrl());

  const supportConfig = useMemo(() => buildSupportWidgetConfig(), []);

  return (
    <div className="app-mesh min-h-[100dvh] w-full text-foreground">
      {usingChromeFallback() && <ChromeFallbackNotice />}
      <SiteNav />
      <main>
        <Hero />
        <FeatureGrid />
        <LiveDemoSection />
        <ConfigReferenceSection />
      </main>
      <SiteFooter />
      <SupportWidget config={supportConfig} />
    </div>
  );
}
