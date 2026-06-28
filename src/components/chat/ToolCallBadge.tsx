/**
 * Surfaces a tool call the assistant made (Anthropic tool_use / OpenAI
 * tool_calls). Renders args + result with copy buttons and a status dot.
 */
import { AlertTriangle, Check, ChevronDown, ChevronRight, Copy, Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button.js";
import { cn } from "../../lib/utils.js";
import type { ToolCallRecord } from "../../types/chat.js";

export interface ToolCallBadgeProps {
  tool: ToolCallRecord;
  className?: string;
}

export function ToolCallBadge({ tool, className }: ToolCallBadgeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"args" | "result" | null>(null);

  const copy = async (text: string, which: "args" | "result") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  };

  const argsText = JSON.stringify(tool.arguments, null, 2);
  const resultText =
    tool.result === undefined
      ? ""
      : typeof tool.result === "string"
      ? tool.result
      : JSON.stringify(tool.result, null, 2);

  const isError = tool.status === "error";
  const dot = isError ? "bg-rose-500" : "bg-emerald-500";

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 px-3 py-2 text-xs",
        isError && "border-rose-500/40 bg-rose-500/5",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3 text-muted-foreground" />
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        <span className="font-mono font-medium">{tool.name}</span>
        {isError && (
          <span className="ml-auto inline-flex items-center gap-1 text-rose-500">
            <AlertTriangle className="h-3 w-3" />
            failed
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Arguments</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5"
                onClick={() => copy(argsText, "args")}
                aria-label="Copy arguments"
              >
                {copied === "args" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded bg-background p-2 text-[11px] leading-relaxed">
              {argsText}
            </pre>
          </div>
          {(resultText || tool.error) && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{isError ? "Error" : "Result"}</span>
                {resultText && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5"
                    onClick={() => copy(resultText, "result")}
                    aria-label="Copy result"
                  >
                    {copied === "result" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
              <pre
                className={cn(
                  "overflow-x-auto rounded bg-background p-2 text-[11px] leading-relaxed",
                  isError && "text-rose-500",
                )}
              >
                {tool.error ?? resultText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}