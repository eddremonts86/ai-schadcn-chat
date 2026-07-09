/**
 * ReasoningPanel — a collapsible "thinking" disclosure that surfaces a model's
 * chain-of-thought (from structured reasoning deltas or inline <think> tags).
 * Auto-expands while the model is actively reasoning, then collapses once the
 * answer arrives; users can toggle it any time.
 */
import { ChevronRight, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.js";
import { Button } from "../ui/button.js";
import { cn } from "../../lib/utils.js";

export interface ReasoningPanelProps {
  reasoning: string;
  /** True while this message is still streaming (model is thinking live). */
  active?: boolean;
}

export function ReasoningPanel({ reasoning, active }: ReasoningPanelProps) {
  const [open, setOpen] = useState(Boolean(active));

  // Follow the live state: open while thinking, collapse when done.
  useEffect(() => {
    setOpen(Boolean(active));
  }, [active]);

  if (!reasoning.trim()) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-fit max-w-full">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="group/think h-7 gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          <Lightbulb className={cn("size-3.5", active && "text-primary")} />
          {active ? (
            <span className="shimmer">Thinking…</span>
          ) : (
            "Thought process"
          )}
          <ChevronRight className="size-3 opacity-60 transition-transform group-data-[state=open]/think:rotate-90" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground scrollbar-thin">
          {reasoning.trim()}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Split assistant content into inline reasoning (`<think>` / `<thinking>`
 * blocks, including an unclosed one mid-stream) and the visible answer.
 */
export function splitReasoning(content: string): { think: string; answer: string } {
  let think = "";
  let answer = content.replace(
    /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi,
    (_m, inner: string) => {
      think += (think ? "\n" : "") + inner;
      return "";
    },
  );
  // Unclosed (streaming) block: everything after the last opening tag.
  const open = /<think(?:ing)?>/i.exec(answer);
  if (open) {
    think += (think ? "\n" : "") + answer.slice(open.index + open[0].length);
    answer = answer.slice(0, open.index);
  }
  return { think: think.trim(), answer: answer.trim() };
}
