import {
  useDeferredValue,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { ChevronDown, Cpu, KeyRound, Server } from "lucide-react";
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

/**
 * Single live chat panel + a right-hand config form.
 * Starts from the Coding Buddy persona. The right-column form mutates
 * the live config via useChat().updateConfig so the panel reacts in
 * place without remounting.
 *
 * The whole playground sits inside a single <ChatProvider> so the form
 * (a sibling of <ChatPanel />) can call useChat() too. <ChatPanel />'s
 * own internal ChatProvider would otherwise create a private store the
 * form can't see, breaking the live-update promise.
 */
export function UnifiedPlayground(): ReactElement {
  const baseConfig: ChatConfig = buildCodingBuddyConfig();
  return (
    <ChatProvider config={baseConfig}>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="h-[min(760px,80dvh)] w-full">
          <ChatPanel config={baseConfig} layout="panel" className="shadow-2xl" />
        </div>
        <aside
          aria-label="Configuration form"
          className="hidden h-[min(760px,80dvh)] overflow-y-auto rounded-2xl border border-border/60 bg-card/40 p-4 lg:block"
        >
          <ConfigForm />
        </aside>
      </div>
    </ChatProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Form section data                              */
/* -------------------------------------------------------------------------- */

interface FormSectionMeta {
  id: "provider" | "model";
  label: string;
  icon: ReactElement;
}

const FORM_SECTIONS: FormSectionMeta[] = [
  { id: "provider", label: "Provider", icon: <Server className="size-3.5" /> },
  { id: "model", label: "Model", icon: <Cpu className="size-3.5" /> },
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
      {FORM_SECTIONS.map((s) => (
        <FormSection key={s.id} section={s} config={config} updateConfig={updateConfig} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Form section                                */
/* -------------------------------------------------------------------------- */

function FormSection({
  section,
  config,
  updateConfig,
}: {
  section: FormSectionMeta;
} & ConfigFormProps): ReactElement {
  const [open, setOpen] = useState(section.id === "provider");
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
            {section.icon}
            {section.label}
          </span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-border/40 px-3 py-3">
        {section.id === "provider" && <ProviderFields config={config} updateConfig={updateConfig} />}
        {section.id === "model" && <ModelFields config={config} updateConfig={updateConfig} />}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Provider / Model                              */
/* -------------------------------------------------------------------------- */

const PROVIDER_KINDS = ["anthropic", "openai", "openai-compatible"] as const;

function ProviderFields({ config, updateConfig }: ConfigFormProps): ReactElement {
  const authHeaderValue =
    typeof config.provider.authHeader === "string" ? config.provider.authHeader : "custom";
  return (
    <>
      <SelectField
        label="kind"
        value={config.provider.kind}
        options={PROVIDER_KINDS.map((v) => ({ value: v, label: v }))}
        onChange={(v) =>
          updateConfig({
            provider: { ...config.provider, kind: v as ChatConfig["provider"]["kind"] },
          })
        }
      />
      <TextField
        label="baseUrl"
        value={config.provider.baseUrl}
        onChange={(v) => updateConfig({ provider: { ...config.provider, baseUrl: v } })}
      />
      <SelectField
        label="authHeader"
        value={authHeaderValue}
        options={[
          { value: "bearer", label: "bearer" },
          { value: "x-api-key", label: "x-api-key" },
        ]}
        onChange={(v) =>
          updateConfig({
            provider: { ...config.provider, authHeader: v as "bearer" | "x-api-key" },
          })
        }
      />
      <SecretField
        label="credentials.apiKey"
        value={config.provider.credentials.apiKey}
        onChange={(v) =>
          updateConfig({
            provider: {
              ...config.provider,
              credentials: { ...config.provider.credentials, apiKey: v },
            },
          })
        }
      />
      <TextField
        label="organization"
        value={config.provider.organization ?? ""}
        onChange={(v) =>
          updateConfig({ provider: { ...config.provider, organization: v || undefined } })
        }
      />
      <TextField
        label="project"
        value={config.provider.project ?? ""}
        onChange={(v) =>
          updateConfig({ provider: { ...config.provider, project: v || undefined } })
        }
      />
      <TextField
        label="chatPath"
        value={config.provider.chatPath ?? "/chat/completions"}
        onChange={(v) =>
          updateConfig({ provider: { ...config.provider, chatPath: v } })
        }
      />
    </>
  );
}

function ModelFields({ config, updateConfig }: ConfigFormProps): ReactElement {
  return (
    <>
      <TextField
        label="id"
        value={config.model.id}
        onChange={(v) => updateConfig({ model: { ...config.model, id: v } })}
      />
      <TextField
        label="label"
        value={config.model.label ?? ""}
        onChange={(v) => updateConfig({ model: { ...config.model, label: v || undefined } })}
      />
      <NumberField
        label="contextWindow"
        value={config.model.contextWindow ?? 0}
        onChange={(v) => updateConfig({ model: { ...config.model, contextWindow: v } })}
      />
      <SwitchField
        label="vision"
        checked={config.model.vision ?? false}
        onChange={(v) => updateConfig({ model: { ...config.model, vision: v } })}
      />
      <SwitchField
        label="tools"
        checked={config.model.tools ?? false}
        onChange={(v) => updateConfig({ model: { ...config.model, tools: v } })}
      />
      <NumberField
        label="maxOutput"
        value={config.model.maxOutput ?? 0}
        onChange={(v) => updateConfig({ model: { ...config.model, maxOutput: v } })}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Field primitives                              */
/* -------------------------------------------------------------------------- */

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
    <FieldRow label={label}>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 font-mono text-xs"
      />
    </FieldRow>
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
    <FieldRow label={label} icon={<KeyRound className="size-3" />}>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 font-mono text-xs"
      />
    </FieldRow>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
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
    <FieldRow label={label}>
      <Input
        type="number"
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 font-mono text-xs"
      />
    </FieldRow>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): ReactElement {
  return (
    <FieldRow label={label}>
      <Switch checked={checked} onCheckedChange={onChange} />
    </FieldRow>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}): ReactElement {
  return (
    <FieldRow label={label}>
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
    </FieldRow>
  );
}

function FieldRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactElement;
  children: ReactElement;
}): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <code className="font-mono">{label}</code>
      </Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}