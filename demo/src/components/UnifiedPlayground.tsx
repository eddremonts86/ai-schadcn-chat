import {
  useDeferredValue,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { ChevronDown, Cpu, KeyRound, LayoutDashboard, Server, Shield, Sliders, User } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "ai-schadcn-chat/components";
import {
  ChatProvider,
  ChatPanel,
  useChat,
  type ChatConfig,
} from "ai-schadcn-chat";
import { buildCodingBuddyConfig } from "../lib/chat-configs";
import { CONFIG_FIELDS, type ConfigField as CatalogField, type ConfigSectionId } from "../content/config-reference";
import { labelFor } from "../content/form-labels";

/**
 * Two-column live playground:
 *   - Left: <ChatPanel /> powered by buildCodingBuddyConfig().
 *   - Right: a collapsible form covering every documented ChatConfig /
 *     UiConfig field, mutating state via useChat().updateConfig.
 *
 * Below the lg breakpoint the right column collapses into a button-triggered
 * drawer so the chat stays the focus on small screens.
 *
 * The whole playground sits inside a single <ChatProvider> so the form
 * (a sibling of <ChatPanel />) can call useChat() too. <ChatPanel />'s
 * own internal ChatProvider would otherwise create a private store the
 * form can't see, breaking the live-update promise.
 */
export function UnifiedPlayground(): ReactElement {
  const baseConfig: ChatConfig = buildCodingBuddyConfig();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ChatProvider config={baseConfig}>
      {/* Mobile-only toggle to open the form drawer */}
      <div className="mb-3 flex justify-end lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          {drawerOpen ? "Hide" : "Show"} config
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="h-[min(760px,80dvh)] w-full">
          <ChatPanel config={baseConfig} layout="panel" className="shadow-2xl" />
        </div>

        {/* Desktop sidebar */}
        <aside
          aria-label="Configuration form"
          className="hidden h-[min(760px,80dvh)] overflow-y-auto rounded-2xl border border-border/60 bg-card/40 p-4 lg:block"
        >
          <ConfigForm />
        </aside>
      </div>

      {/* Mobile drawer */}
      <Collapsible open={drawerOpen} onOpenChange={setDrawerOpen} className="lg:hidden">
        <CollapsibleContent className="mt-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <ConfigForm />
        </CollapsibleContent>
      </Collapsible>
    </ChatProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Form section data                              */
/* -------------------------------------------------------------------------- */

const SECTION_META: Record<ConfigSectionId, { label: string; icon: ReactElement }> = {
  provider: { label: "Provider", icon: <Server className="size-3.5" /> },
  model: { label: "Model", icon: <Cpu className="size-3.5" /> },
  behavior: { label: "Behavior", icon: <Sliders className="size-3.5" /> },
  resilience: { label: "Resilience", icon: <Shield className="size-3.5" /> },
  "personality-and-tools": { label: "Personality & tools", icon: <User className="size-3.5" /> },
  ui: { label: "UI", icon: <LayoutDashboard className="size-3.5" /> },
};

const SECTION_ORDER: ConfigSectionId[] = [
  "provider",
  "model",
  "behavior",
  "resilience",
  "personality-and-tools",
  "ui",
];

/* -------------------------------------------------------------------------- */
/*                                 ConfigForm                                 */
/* -------------------------------------------------------------------------- */

interface ConfigFormProps {
  config: ChatConfig;
  updateConfig: (partial: Partial<ChatConfig>) => void;
}

function ConfigForm(): ReactElement {
  const { config, updateConfig } = useChat();
  return (
    <div className="space-y-2">
      {SECTION_ORDER.map((id) => (
        <FormSection key={id} sectionId={id} config={config} updateConfig={updateConfig} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Form section                                */
/* -------------------------------------------------------------------------- */

function FormSection({
  sectionId,
  config,
  updateConfig,
}: {
  sectionId: ConfigSectionId;
} & ConfigFormProps): ReactElement {
  const [open, setOpen] = useState(sectionId === "provider");
  const meta = SECTION_META[sectionId];
  const fields = CONFIG_FIELDS[sectionId];
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/60 bg-background/40"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
        >
          <span className="inline-flex items-center gap-2">
            {meta.icon}
            {meta.label}
            <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[10px] text-muted-foreground">
              {fields.length}
            </span>
          </span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-border/40 px-3 py-3">
        {fields.map((field) => (
          <FieldControl
            key={field.path}
            field={field}
            config={config}
            updateConfig={updateConfig}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Field dispatch                                */
/* -------------------------------------------------------------------------- */

/**
 * Renders the right control for a catalog entry and wires its onChange
 * to the correct branch of the config tree. New fields added to the
 * catalog need a matching case here; unknown types render a fallback.
 */
function FieldControl({
  field,
  config,
  updateConfig,
}: {
  field: CatalogField;
} & ConfigFormProps): ReactElement {
  const label = labelFor(field.path);
  const helpText =
    field.type === "function"
      ? "Not editable via the form. See the reference docs below."
      : undefined;

  // Provider
  if (field.path === "provider.kind") {
    return (
      <SelectField
        label={label}
        value={config.provider.kind}
        options={[
          { value: "anthropic", label: "anthropic" },
          { value: "openai", label: "openai" },
          { value: "openai-compatible", label: "openai-compatible" },
        ]}
        onChange={(v) =>
          updateConfig({ provider: { ...config.provider, kind: v as ChatConfig["provider"]["kind"] } })
        }
        helpText={helpText}
      />
    );
  }
  if (field.path === "provider.baseUrl") {
    return (
      <TextField
        label={label}
        value={config.provider.baseUrl}
        onChange={(v) => updateConfig({ provider: { ...config.provider, baseUrl: v } })}
      />
    );
  }
  if (field.path === "provider.authHeader") {
    const v = typeof config.provider.authHeader === "string" ? config.provider.authHeader : "custom";
    return (
      <SelectField
        label={label}
        value={v}
        options={[
          { value: "bearer", label: "bearer" },
          { value: "x-api-key", label: "x-api-key" },
        ]}
        onChange={(v) =>
          updateConfig({ provider: { ...config.provider, authHeader: v as "bearer" | "x-api-key" } })
        }
        helpText={helpText}
      />
    );
  }
  if (field.path === "provider.credentials.apiKey") {
    return (
      <SecretField
        label={label}
        value={config.provider.credentials.apiKey}
        onChange={(v) =>
          updateConfig({
            provider: { ...config.provider, credentials: { ...config.provider.credentials, apiKey: v } },
          })
        }
      />
    );
  }
  if (field.path === "provider.credentials.secondaryKey") {
    return (
      <TextField
        label={label}
        value={config.provider.credentials.secondaryKey ?? ""}
        onChange={(v) =>
          updateConfig({
            provider: { ...config.provider, credentials: { ...config.provider.credentials, secondaryKey: v || undefined } },
          })
        }
      />
    );
  }
  if (field.path === "provider.credentials.secondaryKeyHeader") {
    return (
      <TextField
        label={label}
        value={config.provider.credentials.secondaryKeyHeader ?? ""}
        onChange={(v) =>
          updateConfig({
            provider: { ...config.provider, credentials: { ...config.provider.credentials, secondaryKeyHeader: v || undefined } },
          })
        }
      />
    );
  }
  if (field.path === "provider.organization") {
    return (
      <TextField
        label={label}
        value={config.provider.organization ?? ""}
        onChange={(v) => updateConfig({ provider: { ...config.provider, organization: v || undefined } })}
      />
    );
  }
  if (field.path === "provider.project") {
    return (
      <TextField
        label={label}
        value={config.provider.project ?? ""}
        onChange={(v) => updateConfig({ provider: { ...config.provider, project: v || undefined } })}
      />
    );
  }
  if (field.path === "provider.defaultHeaders") {
    return (
      <TextAreaField
        label={label}
        value={JSON.stringify(config.provider.defaultHeaders ?? {}, null, 2)}
        onChange={(v) => {
          try {
            const parsed = v.trim() ? JSON.parse(v) : undefined;
            updateConfig({ provider: { ...config.provider, defaultHeaders: parsed } });
          } catch {
            // ignore until JSON is valid; user keeps typing
          }
        }}
        rows={3}
      />
    );
  }
  if (field.path === "provider.chatPath") {
    return (
      <TextField
        label={label}
        value={config.provider.chatPath ?? "/chat/completions"}
        onChange={(v) => updateConfig({ provider: { ...config.provider, chatPath: v } })}
      />
    );
  }

  // Model
  if (field.path === "model.id") {
    return (
      <TextField
        label={label}
        value={config.model.id}
        onChange={(v) => updateConfig({ model: { ...config.model, id: v } })}
      />
    );
  }
  if (field.path === "model.label") {
    return (
      <TextField
        label={label}
        value={config.model.label ?? ""}
        onChange={(v) => updateConfig({ model: { ...config.model, label: v || undefined } })}
      />
    );
  }
  if (field.path === "model.contextWindow") {
    return (
      <NumberField
        label={label}
        value={config.model.contextWindow ?? 0}
        onChange={(v) => updateConfig({ model: { ...config.model, contextWindow: v } })}
      />
    );
  }
  if (field.path === "model.vision") {
    return (
      <SwitchField
        label={label}
        checked={config.model.vision ?? false}
        onChange={(v) => updateConfig({ model: { ...config.model, vision: v } })}
      />
    );
  }
  if (field.path === "model.tools") {
    return (
      <SwitchField
        label={label}
        checked={config.model.tools ?? false}
        onChange={(v) => updateConfig({ model: { ...config.model, tools: v } })}
      />
    );
  }
  if (field.path === "model.maxOutput") {
    return (
      <NumberField
        label={label}
        value={config.model.maxOutput ?? 0}
        onChange={(v) => updateConfig({ model: { ...config.model, maxOutput: v } })}
      />
    );
  }
  if (field.path === "model.provider") {
    return (
      <SelectField
        label={label}
        value={config.model.provider ?? config.provider.kind}
        options={[
          { value: "anthropic", label: "anthropic" },
          { value: "openai", label: "openai" },
          { value: "openai-compatible", label: "openai-compatible" },
        ]}
        onChange={(v) =>
          updateConfig({ model: { ...config.model, provider: v as ChatConfig["provider"]["kind"] } })
        }
        helpText="Override the provider for this specific model. Defaults to the provider kind in config.provider."
      />
    );
  }
  if (field.path === "model.headers") {
    return (
      <TextAreaField
        label={label}
        value={JSON.stringify(config.model.headers ?? {}, null, 2)}
        onChange={(v) => {
          try {
            const parsed = v.trim() ? JSON.parse(v) : undefined;
            updateConfig({ model: { ...config.model, headers: parsed } });
          } catch {
            // ignore until JSON is valid
          }
        }}
        rows={3}
      />
    );
  }

  // Behavior
  if (field.path === "systemPrompt") {
    return (
      <TextAreaField
        label={label}
        value={config.systemPrompt}
        onChange={(v) => updateConfig({ systemPrompt: v })}
        rows={4}
      />
    );
  }
  if (field.path === "documents") {
    return (
      <ReadOnlyNote
        label={label}
        text={`${config.documents?.length ?? 0} document(s) configured. Edit the JSON in the source code — the form treats documents as structured objects that don't fit a single text field.`}
      />
    );
  }
  if (field.path === "temperature") {
    return (
      <NumberField
        label={label}
        value={config.temperature ?? 0}
        onChange={(v) => updateConfig({ temperature: v })}
        step={0.1}
      />
    );
  }
  if (field.path === "topP") {
    return (
      <NumberField
        label={label}
        value={config.topP ?? 1}
        onChange={(v) => updateConfig({ topP: v })}
        step={0.1}
      />
    );
  }
  if (field.path === "thinking") {
    return (
      <ReadOnlyNote label={label} text="Anthropic extended thinking. Configure via the code path; the form treats it as a structured object." />
    );
  }
  if (field.path === "stopSequences") {
    return (
      <TextField
        label={label}
        value={(config.stopSequences ?? []).join(",")}
        onChange={(v) =>
          updateConfig({
            stopSequences: v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
    );
  }
  if (field.path === "maxContextTokens") {
    return (
      <NumberField
        label={label}
        value={config.maxContextTokens ?? 0}
        onChange={(v) => updateConfig({ maxContextTokens: v || undefined } as Partial<ChatConfig>)}
      />
    );
  }

  // Resilience
  if (field.path === "retry.attempts") {
    const r = config.retry ?? { attempts: 0, initialDelayMs: 0, maxDelayMs: 0 };
    return (
      <NumberField
        label={label}
        value={r.attempts ?? 0}
        onChange={(v) => updateConfig({ retry: { ...r, attempts: v } })}
      />
    );
  }
  if (field.path === "retry.initialDelayMs") {
    const r = config.retry ?? { attempts: 0, initialDelayMs: 0, maxDelayMs: 0 };
    return (
      <NumberField
        label={label}
        value={r.initialDelayMs ?? 0}
        onChange={(v) => updateConfig({ retry: { ...r, initialDelayMs: v } })}
      />
    );
  }
  if (field.path === "retry.maxDelayMs") {
    const r = config.retry ?? { attempts: 0, initialDelayMs: 0, maxDelayMs: 0 };
    return (
      <NumberField
        label={label}
        value={r.maxDelayMs ?? 0}
        onChange={(v) => updateConfig({ retry: { ...r, maxDelayMs: v } })}
      />
    );
  }
  if (field.path === "persistKey") {
    const enabled = config.persistKey !== false;
    const value = typeof config.persistKey === "string" ? config.persistKey : "";
    return (
      <div className="space-y-2">
        <SwitchField
          label="Persistence enabled"
          checked={enabled}
          onChange={(v) =>
            updateConfig({
              persistKey: v ? value || "ai-schadcn-chat:default" : false,
            })
          }
        />
        <TextField
          label={label}
          value={value}
          onChange={(v) =>
            updateConfig({
              persistKey: v || (config.persistKey === false ? false : "ai-schadcn-chat:default"),
            })
          }
        />
      </div>
    );
  }
  if (field.path === "onResponse" || field.path === "onError") {
    return <ReadOnlyNote label={label} text="Closures cannot be set from a form. Pass via defaultConfig({ onResponse, onError }) in your app code." />;
  }

  // Personality & tools
  if (field.path === "personality.name") {
    return (
      <TextField
        label={label}
        value={config.personality?.name ?? ""}
        onChange={(v) =>
          updateConfig({ personality: { ...config.personality, name: v || undefined } })
        }
      />
    );
  }
  if (field.path === "personality.avatar") {
    return (
      <TextField
        label={label}
        value={config.personality?.avatar ?? ""}
        onChange={(v) =>
          updateConfig({ personality: { ...config.personality, avatar: v || undefined } })
        }
      />
    );
  }
  if (field.path === "personality.tone") {
    return (
      <SelectField
        label={label}
        value={config.personality?.tone ?? "friendly"}
        options={[
          { value: "friendly", label: "friendly" },
          { value: "professional", label: "professional" },
          { value: "casual", label: "casual" },
          { value: "concise", label: "concise" },
          { value: "playful", label: "playful" },
          { value: "academic", label: "academic" },
          { value: "sarcastic", label: "sarcastic" },
        ]}
        onChange={(v) =>
          updateConfig({
            personality: {
              ...config.personality,
              tone: v as NonNullable<ChatConfig["personality"]>["tone"],
            },
          })
        }
      />
    );
  }
  if (field.path === "personality.customTone") {
    return (
      <TextAreaField
        label={label}
        value={config.personality?.customTone ?? ""}
        onChange={(v) =>
          updateConfig({
            personality: { ...config.personality, customTone: v || undefined },
          })
        }
        rows={3}
      />
    );
  }
  if (field.path === "personality.locale") {
    return (
      <TextField
        label={label}
        value={config.personality?.locale ?? ""}
        onChange={(v) =>
          updateConfig({ personality: { ...config.personality, locale: v || undefined } })
        }
      />
    );
  }
  if (field.path === "tools") {
    return (
      <ReadOnlyNote
        label={label}
        text={`${config.tools?.length ?? 0} tool(s) registered. Tool handlers are closures — set them via defaultConfig({ tools: [...] }) in your app code.`}
      />
    );
  }

  // UI - text
  if (field.path === "ui.title") {
    return (
      <TextField
        label={label}
        value={config.ui?.title ?? ""}
        onChange={(v) => updateConfig({ ui: { ...config.ui, title: v } })}
      />
    );
  }
  if (field.path === "ui.subtitle") {
    return (
      <TextField
        label={label}
        value={config.ui?.subtitle ?? ""}
        onChange={(v) => updateConfig({ ui: { ...config.ui, subtitle: v || undefined } })}
      />
    );
  }
  if (field.path === "ui.placeholder") {
    return (
      <TextField
        label={label}
        value={config.ui?.placeholder ?? ""}
        onChange={(v) => updateConfig({ ui: { ...config.ui, placeholder: v } })}
      />
    );
  }
  if (field.path === "ui.greeting") {
    return (
      <TextField
        label={label}
        value={config.ui?.greeting ?? ""}
        onChange={(v) => updateConfig({ ui: { ...config.ui, greeting: v || undefined } })}
      />
    );
  }
  if (field.path === "ui.suggestions") {
    return (
      <TextAreaField
        label={label}
        value={(config.ui?.suggestions ?? []).join("\n")}
        onChange={(v) =>
          updateConfig({
            ui: {
              ...config.ui,
              suggestions: v.split("\n").map((s) => s.trim()).filter(Boolean),
            },
          })
        }
        rows={4}
        helpText="One suggestion per line."
      />
    );
  }
  if (field.path === "ui.emptyState") {
    return <ReadOnlyNote label={label} text="Custom ReactNode. Set via defaultConfig({ ui: { emptyState: <MyComponent /> } }) in your app code." />;
  }

  // UI - toggles
  if (field.path.startsWith("ui.show") || field.path.startsWith("ui.enable")) {
    const uiField = field.path.replace(/^ui\./, "");
    return (
      <SwitchField
        label={label}
        checked={Boolean(config.ui?.[uiField as keyof NonNullable<ChatConfig["ui"]>])}
        onChange={(v) =>
          updateConfig({
            ui: { ...config.ui, [uiField]: v } as NonNullable<ChatConfig["ui"]>,
          })
        }
      />
    );
  }

  // UI - attachments
  if (field.path === "ui.maxFileSizeMb") {
    return (
      <NumberField
        label={label}
        value={config.ui?.maxFileSizeMb ?? 0}
        onChange={(v) => updateConfig({ ui: { ...config.ui, maxFileSizeMb: v } })}
      />
    );
  }
  if (field.path === "ui.acceptedFileTypes") {
    return (
      <TextAreaField
        label={label}
        value={(config.ui?.acceptedFileTypes ?? []).join(", ")}
        onChange={(v) =>
          updateConfig({
            ui: {
              ...config.ui,
              acceptedFileTypes: v.split(",").map((s) => s.trim()).filter(Boolean),
            },
          })
        }
        rows={3}
        helpText="Comma-separated MIME types, e.g. image/png, application/pdf."
      />
    );
  }

  // UI - theming
  if (field.path === "ui.theme") {
    return (
      <SelectField
        label={label}
        value={config.ui?.theme ?? "system"}
        options={[
          { value: "light", label: "light" },
          { value: "dark", label: "dark" },
          { value: "system", label: "system" },
        ]}
        onChange={(v) =>
          updateConfig({
            ui: { ...config.ui, theme: v as NonNullable<ChatConfig["ui"]>["theme"] },
          })
        }
      />
    );
  }
  if (field.path === "ui.accentColor") {
    return (
      <TextField
        label={label}
        value={config.ui?.accentColor ?? ""}
        onChange={(v) =>
          updateConfig({ ui: { ...config.ui, accentColor: v || undefined } })
        }
      />
    );
  }
  if (field.path === "ui.fontFamily") {
    return (
      <TextField
        label={label}
        value={config.ui?.fontFamily ?? ""}
        onChange={(v) =>
          updateConfig({ ui: { ...config.ui, fontFamily: v || undefined } })
        }
      />
    );
  }
  if (field.path === "ui.density") {
    return (
      <SelectField
        label={label}
        value={config.ui?.density ?? "comfortable"}
        options={[
          { value: "compact", label: "compact" },
          { value: "comfortable", label: "comfortable" },
          { value: "spacious", label: "spacious" },
        ]}
        onChange={(v) =>
          updateConfig({
            ui: { ...config.ui, density: v as NonNullable<ChatConfig["ui"]>["density"] },
          })
        }
      />
    );
  }

  // UI - layout
  if (field.path === "ui.layout") {
    return (
      <SelectField
        label={label}
        value={config.ui?.layout ?? "panel"}
        options={[
          { value: "panel", label: "panel" },
          { value: "floating", label: "floating" },
          { value: "fullpage", label: "fullpage" },
        ]}
        onChange={(v) =>
          updateConfig({
            ui: { ...config.ui, layout: v as NonNullable<ChatConfig["ui"]>["layout"] },
          })
        }
      />
    );
  }
  if (field.path === "ui.height" || field.path === "ui.width") {
    const which = field.path === "ui.height" ? "height" : "width";
    const raw = config.ui?.[which];
    const value = raw != null ? String(raw) : "";
    return (
      <TextField
        label={label}
        value={value}
        onChange={(v) => {
          const n = Number(v);
          const next = !v ? undefined : Number.isFinite(n) ? n : v;
          updateConfig({ ui: { ...config.ui, [which]: next } as NonNullable<ChatConfig["ui"]> });
        }}
        helpText="Number = pixels, string = any CSS length (e.g. 'min(80dvh, 760px)')."
      />
    );
  }
  if (field.path === "ui.position") {
    return (
      <SelectField
        label={label}
        value={config.ui?.position ?? "bottom-right"}
        options={[
          { value: "bottom-right", label: "bottom-right" },
          { value: "bottom-left", label: "bottom-left" },
          { value: "top-right", label: "top-right" },
          { value: "top-left", label: "top-left" },
        ]}
        onChange={(v) =>
          updateConfig({
            ui: { ...config.ui, position: v as NonNullable<ChatConfig["ui"]>["position"] },
          })
        }
        helpText="Only meaningful with layout: floating."
      />
    );
  }
  if (field.path === "ui.className") {
    return (
      <TextField
        label={label}
        value={config.ui?.className ?? ""}
        onChange={(v) =>
          updateConfig({ ui: { ...config.ui, className: v || undefined } })
        }
      />
    );
  }

  // UI - render slots
  if (
    field.path === "ui.renderMessage" ||
    field.path === "ui.renderHeader" ||
    field.path === "ui.renderFooter"
  ) {
    return <ReadOnlyNote label={label} text="Render slot. Pass a function via defaultConfig({ ui: { renderMessage: (msg) => … } }) in your app code." />;
  }

  // Unknown field type — keep the form compiling even when the catalog
  // grows ahead of this dispatcher.
  return <ReadOnlyNote label={label} text={`No form control implemented yet for type "${field.type}". See the reference docs below.`} />;
}

/* -------------------------------------------------------------------------- */
/*                              Field primitives                              */
/* -------------------------------------------------------------------------- */

function TextField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpText?: string;
}): ReactElement {
  const [draft, setDraft] = useState(value);
  const deferred = useDeferredValue(draft);
  useEffect(() => {
    onChange(deferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred]);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <FieldShell label={label} helpText={helpText}>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 font-mono text-xs"
      />
    </FieldShell>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  helpText?: string;
}): ReactElement {
  const [draft, setDraft] = useState(value);
  const deferred = useDeferredValue(draft);
  useEffect(() => {
    onChange(deferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred]);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <FieldShell label={label} helpText={helpText} vertical>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={rows}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
      />
    </FieldShell>
  );
}

function SecretField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): ReactElement {
  return (
    <FieldShell label={label} icon={<KeyRound className="size-3" />}>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 font-mono text-xs"
      />
    </FieldShell>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  helpText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  helpText?: string;
}): ReactElement {
  const [draft, setDraft] = useState(String(value));
  const deferred = useDeferredValue(draft);
  useEffect(() => {
    const n = Number(deferred);
    if (!Number.isNaN(n)) onChange(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred]);
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  return (
    <FieldShell label={label} helpText={helpText}>
      <Input
        type="number"
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 font-mono text-xs"
      />
    </FieldShell>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
  helpText,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  helpText?: string;
}): ReactElement {
  return (
    <FieldShell label={label} helpText={helpText}>
      <Switch checked={checked} onCheckedChange={onChange} />
    </FieldShell>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  helpText,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  helpText?: string;
}): ReactElement {
  return (
    <FieldShell label={label} helpText={helpText}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function ReadOnlyNote({
  label,
  text,
}: {
  label: string;
  text: string;
}): ReactElement {
  return (
    <FieldShell label={label} helpText={text} vertical>
      <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
        {text}
      </div>
    </FieldShell>
  );
}

function FieldShell({
  label,
  icon,
  helpText,
  vertical,
  children,
}: {
  label: string;
  icon?: ReactElement;
  helpText?: string;
  vertical?: boolean;
  children: ReactElement;
}): ReactElement {
  const labelEl = (
    <Label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      <span>{label}</span>
    </Label>
  );
  const helpEl = helpText ? (
    <p className="text-[11px] leading-snug text-muted-foreground/80">{helpText}</p>
  ) : null;

  if (vertical) {
    return (
      <div className="space-y-1.5">
        {labelEl}
        {children}
        {helpEl}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        {labelEl}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {helpEl && <div className="pl-0">{helpEl}</div>}
    </div>
  );
}