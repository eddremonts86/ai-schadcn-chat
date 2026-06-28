/**
 * Typing-indicator dots shown while the assistant is streaming before
 * the first delta arrives.
 */
import { cn } from "../../lib/utils.js";

export interface ThinkingDotsProps {
  className?: string;
  label?: string;
}

export function ThinkingDots({ className, label = "Thinking" }: ThinkingDotsProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span className="flex items-center gap-1">
        <span
          className="h-1.5 w-1.5 rounded-full bg-current animate-thinking-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-current animate-thinking-dot"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-current animate-thinking-dot"
          style={{ animationDelay: "300ms" }}
        />
      </span>
      {label}
    </div>
  );
}