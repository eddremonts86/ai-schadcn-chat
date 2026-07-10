import { Code2, Layers, Palette, Plug, Wrench, Zap, type LucideIcon } from "lucide-react";
import { FEATURES, THREE_SURFACES, type FeatureItem } from "../content/site";

const ICONS: Record<FeatureItem["icon"], LucideIcon> = {
  layers: Layers,
  plug: Plug,
  palette: Palette,
  wrench: Wrench,
  zap: Zap,
  code: Code2,
};

export function FeatureGrid() {
  const featured = FEATURES.find((f) => f.featured);
  const rest = FEATURES.filter((f) => !f.featured);

  return (
    <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a chat UI needs. Nothing it doesn&apos;t.
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Six things ai-schadcn-chat gets right out of the box.
          </p>
        </div>

        {featured && <FeaturedRow feature={featured} />}

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((feature) => (
            <FeatureCell key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedRow({ feature }: { feature: FeatureItem }) {
  const Icon = ICONS[feature.icon];
  return (
    <div className="surface-elevated mt-10 flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl grad-primary text-primary-foreground shadow-sm glow-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{feature.title}</h3>
        <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {THREE_SURFACES.map((surface) => (
            <code
              key={surface}
              className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary sm:text-xs"
            >
              {surface}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}


function FeatureCell({ feature }: { feature: FeatureItem }) {
  const Icon = ICONS[feature.icon];
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-6 transition-colors hover:border-border hover:bg-card">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Icon className="size-4" />
      </span>
      <h3 className="font-semibold tracking-tight">{feature.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
    </div>
  );
}

