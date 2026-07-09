/**
 * AgentManager — a dialog to create, read, update, and delete switchable
 * assistant "agents". Built-in agents are read-only (but can be duplicated);
 * user agents persist to localStorage via `lib/agents`. Picking an agent
 * calls `onApply`, which the header maps onto the live chat config.
 */
import {
  ArrowLeft,
  Check,
  Copy,
  Pencil,
  Plus,
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
import { Badge } from "../ui/badge.js";
import {
  deleteAgent as removeAgent,
  duplicateAgent,
  listAgents,
  saveAgent,
} from "../../lib/agents.js";
import { cn } from "../../lib/utils.js";
import type { Agent } from "../../types/chat.js";

const TONES = [
  "friendly",
  "professional",
  "casual",
  "concise",
  "playful",
  "academic",
] as const;

export interface AgentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeAgentId?: string | null;
  onApply: (agent: Agent) => void;
  /** Open straight into the create form. */
  startInCreate?: boolean;
}

type Draft = {
  id?: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  tone: string;
  suggestions: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  icon: "🤖",
  systemPrompt: "",
  tone: "friendly",
  suggestions: "",
};

function toDraft(a: Agent): Draft {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? "",
    icon: a.icon ?? "🤖",
    systemPrompt: a.systemPrompt,
    tone: (a.tone as string) ?? "friendly",
    suggestions: (a.suggestions ?? []).join("\n"),
  };
}

export function AgentManager({
  open,
  onOpenChange,
  activeAgentId,
  onApply,
  startInCreate = false,
}: AgentManagerProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [view, setView] = useState<"list" | "edit">("list");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const refresh = () => setAgents(listAgents());

  useEffect(() => {
    if (open) {
      refresh();
      setView(startInCreate ? "edit" : "list");
      setDraft(EMPTY_DRAFT);
    }
  }, [open, startInCreate]);

  const startCreate = () => {
    setDraft(EMPTY_DRAFT);
    setView("edit");
  };
  const startEdit = (a: Agent) => {
    setDraft(toDraft(a));
    setView("edit");
  };

  const canSave = draft.name.trim().length > 0 && draft.systemPrompt.trim().length > 0;

  const onSave = () => {
    if (!canSave) return;
    const saved = saveAgent({
      id: draft.id,
      name: draft.name,
      description: draft.description,
      icon: draft.icon,
      systemPrompt: draft.systemPrompt,
      tone: draft.tone,
      suggestions: draft.suggestions.split("\n"),
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
            agents={agents}
            activeAgentId={activeAgentId}
            onCreate={startCreate}
            onEdit={startEdit}
            onApply={(a) => {
              onApply(a);
              onOpenChange(false);
            }}
            onDuplicate={(id) => {
              duplicateAgent(id);
              refresh();
            }}
            onDelete={(id) => {
              removeAgent(id);
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
  agents,
  activeAgentId,
  onCreate,
  onEdit,
  onApply,
  onDuplicate,
  onDelete,
}: {
  agents: Agent[];
  activeAgentId?: string | null;
  onCreate: () => void;
  onEdit: (a: Agent) => void;
  onApply: (a: Agent) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <DialogHeader className="border-b border-border/60 p-5 pb-4">
        <DialogTitle>Agents</DialogTitle>
        <DialogDescription>
          Switch, create, edit, or remove your assistant agents.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[55vh] space-y-1.5 overflow-y-auto p-3 scrollbar-thin">
        {agents.map((a) => {
          const active = a.id === activeAgentId;
          return (
            <div
              key={a.id}
              className={cn(
                "group/agent flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
                active
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 hover:bg-accent/50",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-lg">
                {a.icon ?? "🤖"}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onApply(a)}
                className="h-auto min-w-0 flex-1 flex-col items-stretch justify-start gap-0 p-0 text-left hover:bg-transparent"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  {active && (
                    <Check className="size-3.5 shrink-0 text-primary" />
                  )}
                  {a.builtIn && (
                    <Badge variant="secondary" className="text-[9px]">
                      built-in
                    </Badge>
                  )}
                </span>
                {a.description && (
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {a.description}
                  </span>
                )}
              </Button>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/agent:opacity-100 focus-within:opacity-100">
                <IconBtn label="Duplicate" onClick={() => onDuplicate(a.id)}>
                  <Copy className="size-3.5" />
                </IconBtn>
                {!a.builtIn && (
                  <>
                    <IconBtn label="Edit" onClick={() => onEdit(a)}>
                      <Pencil className="size-3.5" />
                    </IconBtn>
                    <IconBtn
                      label="Delete"
                      destructive
                      onClick={() => onDelete(a.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </IconBtn>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DialogFooter className="border-t border-border/60 p-4">
        <Button onClick={onCreate} className="w-full gap-2 sm:w-auto">
          <Plus className="size-4" />
          New agent
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
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <>
      <DialogHeader className="border-b border-border/60 p-5 pb-4">
        <DialogTitle className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Back to list"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Button>
          {draft.id ? "Edit agent" : "New agent"}
        </DialogTitle>
      </DialogHeader>

      <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5 scrollbar-thin">
        <div className="flex gap-3">
          <Field label="Icon" className="w-20">
            <Input
              value={draft.icon}
              onChange={(e) => set("icon", e.target.value.slice(0, 2))}
              className="text-center text-lg"
              maxLength={2}
            />
          </Field>
          <Field label="Name" className="flex-1">
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. SQL expert"
            />
          </Field>
        </div>

        <Field label="Description">
          <Input
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="One-line summary (optional)"
          />
        </Field>

        <Field label="System prompt">
          <Textarea
            value={draft.systemPrompt}
            onChange={(e) => set("systemPrompt", e.target.value)}
            placeholder="You are a helpful assistant that…"
            className="min-h-28 resize-y"
          />
        </Field>

        <Field label="Tone">
          <Select value={draft.tone} onValueChange={(v) => set("tone", v)}>
            <SelectTrigger className="capitalize">
              <SelectValue placeholder="Select a tone" />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Starter suggestions" hint="one per line">
          <Textarea
            value={draft.suggestions}
            onChange={(e) => set("suggestions", e.target.value)}
            placeholder={"Explain a concept\nReview my code"}
            className="min-h-20 resize-y"
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

function IconBtn({
  label,
  destructive,
  onClick,
  children,
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:bg-foreground/10",
        destructive ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}
