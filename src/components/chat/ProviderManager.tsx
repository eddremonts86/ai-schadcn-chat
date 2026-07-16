/**
 * ProviderManager — a dialog to create, read, update, and delete LLM provider
 * profiles (connection details + model list + API key). Profiles persist to
 * localStorage via `lib/providers`. Picking a provider calls `onApply`, which
 * the composer/header maps onto the live chat config via `updateConfig`.
 */
import {
  ArrowLeft,
  Check,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.js";
import { Button } from "../ui/button.js";
import { Input, Textarea } from "../ui/input.js";
import { Label } from "../ui/label.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.js";
import {
  deleteProvider as removeProvider,
  duplicateProvider,
  listProviders,
  modelsToText,
  parseModelsText,
  resetProviders,
  saveProvider,
} from "../../lib/providers.js";
import { cn } from "../../lib/utils.js";
import type { ProviderKind, ProviderProfile } from "../../types/chat.js";

const KINDS: { value: ProviderKind; label: string }[] = [
  { value: "anthropic", label: "Anthropic (native)" },
  { value: "openai", label: "OpenAI (native)" },
  { value: "openai-compatible", label: "OpenAI-compatible" },
  { value: "chrome-builtin", label: "Chrome on-device (Gemini Nano)" },
];

export interface ProviderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeProviderId?: string | null;
  onApply: (profile: ProviderProfile) => void;
  startInCreate?: boolean;
}

type Draft = {
  id?: string;
  name: string;
  icon: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  models: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  icon: "🔌",
  kind: "openai-compatible",
  baseUrl: "",
  apiKey: "",
  models: "",
};

function toDraft(p: ProviderProfile): Draft {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon ?? "🔌",
    kind: p.kind,
    baseUrl: p.baseUrl,
    apiKey: p.apiKey,
    models: modelsToText(p.models),
  };
}

export function ProviderManager({
  open,
  onOpenChange,
  activeProviderId,
  onApply,
  startInCreate = false,
}: ProviderManagerProps) {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [view, setView] = useState<"list" | "edit">("list");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const refresh = () => setProviders(listProviders());

  useEffect(() => {
    if (open) {
      refresh();
      setView(startInCreate ? "edit" : "list");
      setDraft(EMPTY_DRAFT);
    }
  }, [open, startInCreate]);

  const canSave =
    draft.name.trim().length > 0 &&
    (draft.kind === "chrome-builtin" || draft.baseUrl.trim().length > 0);

  const onSave = () => {
    if (!canSave) return;
    const saved = saveProvider({
      id: draft.id,
      name: draft.name,
      icon: draft.icon,
      kind: draft.kind,
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
      models: parseModelsText(draft.models, draft.kind),
    });
    refresh();
    onApply(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {view === "list" ? (
          <ListView
            providers={providers}
            activeProviderId={activeProviderId}
            onCreate={() => {
              setDraft(EMPTY_DRAFT);
              setView("edit");
            }}
            onEdit={(p) => {
              setDraft(toDraft(p));
              setView("edit");
            }}
            onApply={(p) => {
              onApply(p);
              onOpenChange(false);
            }}
            onDuplicate={(id) => {
              duplicateProvider(id);
              refresh();
            }}
            onDelete={(id) => {
              removeProvider(id);
              refresh();
            }}
            onReset={() => {
              resetProviders();
              refresh();
            }}
          />
        ) : (
          <EditView
            draft={draft}
            setDraft={setDraft}
            canSave={canSave}
            onBack={() => setView("list")}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListView({
  providers,
  activeProviderId,
  onCreate,
  onEdit,
  onApply,
  onDuplicate,
  onDelete,
  onReset,
}: {
  providers: ProviderProfile[];
  activeProviderId?: string | null;
  onCreate: () => void;
  onEdit: (p: ProviderProfile) => void;
  onApply: (p: ProviderProfile) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}) {
  const active = providers.find((p) => p.id === activeProviderId);
  const others = providers.filter((p) => p.id !== active?.id);

  return (
    <>
      <DialogHeader className="border-b border-border/60 p-5 pb-3">
        <DialogTitle>Providers &amp; models</DialogTitle>
        <DialogDescription className="text-xs">
          Any OpenAI / Anthropic-compatible API. Keys stay in your browser.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[58vh] overflow-y-auto p-2 scrollbar-thin">
        {active && (
          <>
            <SectionLabel>Active</SectionLabel>
            <ProviderRow
              p={active}
              active
              onApply={onApply}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
            <div className="h-2" />
          </>
        )}
        <SectionLabel>{active ? "Available" : "Providers"}</SectionLabel>
        {others.map((p) => (
          <ProviderRow
            key={p.id}
            p={p}
            onApply={onApply}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DialogFooter className="flex-row items-center justify-between border-t border-border/60 p-4 sm:justify-between">
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="size-3.5" />
          Reset defaults
        </Button>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="size-4" />
          New provider
        </Button>
      </DialogFooter>
    </>
  );
}

function EditView({
  draft,
  setDraft,
  canSave,
  onBack,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  canSave: boolean;
  onBack: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  return (
    <>
      <DialogHeader className="border-b border-border/60 p-5 pb-4">
        <DialogTitle className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to list" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Button>
          {draft.id ? "Edit provider" : "New provider"}
        </DialogTitle>
      </DialogHeader>

      <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5 scrollbar-thin">
        <div className="flex gap-3">
          <Field label="Icon" className="w-20">
            <Input value={draft.icon} onChange={(e) => set("icon", e.target.value.slice(0, 2))} className="text-center text-lg" maxLength={2} />
          </Field>
          <Field label="Name" className="flex-1">
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Groq" />
          </Field>
        </div>

        <Field label="Protocol">
          <Select value={draft.kind} onValueChange={(v) => set("kind", v as ProviderKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {draft.kind === "chrome-builtin" ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            Runs on-device via Chrome's built-in model — no URL or key needed. Requires Chrome 138+
            on supported hardware with the Prompt API enabled.
          </p>
        ) : (
          <>
            <Field label="Base URL">
              <Input value={draft.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://api.example.com/v1" className="font-mono text-xs" />
            </Field>

            <Field label="API key" hint="stored in your browser">
              <Input type="password" value={draft.apiKey} onChange={(e) => set("apiKey", e.target.value)} placeholder="sk-…" className="font-mono text-xs" autoComplete="off" />
            </Field>
          </>
        )}

        <Field label="Models" hint="one per line · id | Label">
          <Textarea
            value={draft.models}
            onChange={(e) => set("models", e.target.value)}
            placeholder={"gpt-4o | GPT-4o\ngpt-4o-mini | GPT-4o mini"}
            className="min-h-24 resize-y font-mono text-xs"
          />
        </Field>
      </div>

      <DialogFooter className="gap-2 border-t border-border/60 p-4">
        <Button variant="ghost" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={!canSave} className="gap-2">
          <Check className="size-4" />
          Save &amp; use
        </Button>
      </DialogFooter>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
      {children}
    </p>
  );
}

function hostLabel(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, "");
}

function ProviderRow({
  p,
  active,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  p: ProviderProfile;
  active?: boolean;
  onApply: (p: ProviderProfile) => void;
  onEdit: (p: ProviderProfile) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group/prov flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        active ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-accent/50",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-base">
        {p.icon ?? "🔌"}
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onApply(p)}
        className="h-auto min-w-0 flex-1 flex-col items-stretch justify-start gap-0.5 p-0 text-left hover:bg-transparent"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{p.name}</span>
          {active && <Check className="size-3.5 shrink-0 text-primary" />}
        </span>
        <span className="flex items-center gap-1.5 truncate text-[11px] font-normal text-muted-foreground">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              p.apiKey ? "bg-success" : "bg-muted-foreground/40",
            )}
            title={p.apiKey ? "API key set" : "No API key"}
          />
          <span className="truncate font-mono">{hostLabel(p.baseUrl)}</span>
          <span className="shrink-0 text-muted-foreground/60">
            · {p.models.length} model{p.models.length === 1 ? "" : "s"}
          </span>
        </span>
      </Button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/prov:opacity-100">
        <Button variant="ghost" size="icon-sm" aria-label="Duplicate" onClick={() => onDuplicate(p.id)} className="text-muted-foreground hover:text-foreground">
          <Copy className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => onEdit(p)} className="text-muted-foreground hover:text-foreground">
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => onDelete(p.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="text-muted-foreground/60">· {hint}</span>}
      </Label>
      {children}
    </div>
  );
}
