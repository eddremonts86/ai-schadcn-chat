import { useState, type ReactElement } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { Badge, Collapsible, CollapsibleContent, CollapsibleTrigger } from "ai-schadcn-chat/components";
import type { ConfigField as ConfigFieldEntry } from "../content/config-reference";

/**
 * One collapsible card per documented config field. Layout:
 *   - Trigger row: field name, type chip, default chip, chevron
 *   - Content: description, optional notes, example block with copy button
 *
 * Kept stateless w.r.t. the surrounding page so any number can be expanded
 * at once. The copy button owns its own "copied" feedback state.
 */
export function ConfigField({ field }: { field: ConfigFieldEntry }): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/60 bg-card/40 transition-colors hover:border-border data-[state=open]:border-border data-[state=open]:bg-card/60"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-sm font-semibold text-foreground">
                {field.name}
              </code>
              <TypeChip type={field.type} />
              {field.required && (
                <Badge variant="destructive" className="px-1.5 py-0 text-[10px] uppercase">
                  required
                </Badge>
              )}
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                default: <span className="text-foreground/80">{field.defaultValue}</span>
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground sm:hidden">
              {field.description.split("\n")[0]}
            </p>
          </div>
          <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border/60 px-4 pb-4 pt-3">
        <p className="text-sm leading-relaxed text-foreground/90">{field.description}</p>

        {field.enumValues && field.enumValues.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {field.enumValues.map((v) => (
              <code
                key={v}
                className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 font-mono text-xs"
              >
                {v}
              </code>
            ))}
          </div>
        )}

        {field.notes && field.notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {field.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-background/70">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              example
            </span>
            <CopyButton text={field.example} />
          </div>
          <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
            <code className="font-mono text-foreground/90">{field.example}</code>
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TypeChip({ type }: { type: ConfigFieldEntry["type"] }): ReactElement {
  const color =
    type === "function"
      ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30"
      : type === "boolean"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
        : type === "number"
          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
          : type === "enum"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            : type === "object" || type === "array" || type === "string[]"
              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
              : type === "string | number" || type === "string | false"
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0 font-mono text-[11px] ${color}`}
    >
      {type}
    </span>
  );
}

function CopyButton({ text }: { text: string }): ReactElement {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select the text. Old browsers / restricted contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={copied ? "Copied" : "Copy example"}
    >
      {copied ? (
        <>
          <Check className="size-3" />
          copied
        </>
      ) : (
        <>
          <Copy className="size-3" />
          copy
        </>
      )}
    </button>
  );
}