import { Code2, Layers, Palette, Plug, Wrench, Zap, type LucideIcon } from "lucide-react";
import { cn } from "ai-schadcn-chat/lib";
import { FEATURES, type FeatureItem } from "../content/site";

const ICONS: Record<FeatureItem["icon"], LucideIcon> = {
  layers: Layers,
  plug: Plug,
  palette: Palette,
  wrench: Wrench,
  zap: Zap,
  code: Code2,
};

export function FeatureGrid() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a chat UI needs. Nothing it doesn&apos;t.
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Six things ai-schadcn-chat gets right out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon];
            return (
              <article
                key={feature.title}
                className={cn(
                  "surface-elevated rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-0.5",
                  feature.wide && "sm:col-span-2",
                )}
              >
                <span className="mb-4 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <h3 className="font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
