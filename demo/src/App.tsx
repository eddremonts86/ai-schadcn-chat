import { useMemo, type ReactElement } from "react";
import { minimaxApiKey, minimaxBaseUrl } from "./lib/env";
import { buildSupportWidgetConfig } from "./lib/chat-configs";
import { useMiniMaxProviderSync } from "./hooks/useMiniMaxProviderSync";
import { SiteNav } from "./components/SiteNav";
import { Hero } from "./components/Hero";
import { FeatureGrid } from "./components/FeatureGrid";
import { LiveDemoSection } from "./components/LiveDemoSection";
import { SiteFooter } from "./components/SiteFooter";
import { SupportWidget } from "./components/SupportWidget";

/**
 * Landing page for the ai-schadcn-chat npm package. Two personas run against
 * the same MiniMax deployment (see lib/chat-configs.ts):
 *
 *  • "Coding buddy" — the real <ChatPanel /> rendered inline in #live-demo.
 *  • "Docs guide" — behind the floating support bubble bottom-right.
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
      <SiteNav />
      <main>
        <Hero />
        <FeatureGrid />
        <LiveDemoSection />
      </main>
      <SiteFooter />
      <SupportWidget config={supportConfig} />
    </div>
  );
}
