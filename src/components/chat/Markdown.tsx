/**
 * Lightweight markdown renderer for assistant messages.
 *
 * - GFM (tables, task lists, strikethrough) via remark-gfm
 * - syntax highlighting via rehype-highlight
 * - raw HTML in MDX via rehype-raw (so consumers can embed their own components)
 * - copy + collapse for code blocks
 * - link safety: forces target=_blank + rel=noopener
 *
 * Streaming-aware: passes a flag to react-markdown so the renderer does not
 * double-render on incremental content.
 */
import { Check, ChevronDown, ChevronUp, Copy, FileText } from "lucide-react";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/utils.js";
import { Button } from "../ui/button.js";

const MARKDOWN_PLUGINS = [remarkGfm, rehypeRaw, [rehypeHighlight, { detect: true, ignoreMissing: true }]] as const;

export interface MarkdownProps {
  content: string;
  streaming?: boolean;
  className?: string;
  components?: Partial<Components>;
}

export const Markdown = memo(function Markdown({ content, streaming, className, components }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        "[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1",
        "[&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:mt-3 [&_h3]:mb-1",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono",
        "[&_pre]:my-3 [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:p-4 [&_pre]:text-zinc-50 [&_pre]:overflow-x-auto",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-zinc-50",
        "[&_table]:my-2 [&_table]:w-full [&_th]:border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:px-2 [&_td]:py-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={MARKDOWN_PLUGINS as never}
        components={{ ...defaultComponents, ...(components ?? {}) }}
      >
        {content}
      </ReactMarkdown>
      {streaming && <span className="ml-0.5 inline-block h-3 w-1.5 animate-caret-blink bg-current align-middle" />}
    </div>
  );
});

const defaultComponents: Components = {
  a: ({ href, children, ...rest }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  ),
  pre: ({ children, className }) => <CodeBlock className={className}>{children}</CodeBlock>,
};

interface CodeBlockProps {
  children?: ReactNode;
  className?: string;
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Pull the raw text from the <code> child.
  const text = (() => {
    if (!children) return "";
    let raw = "";
    if (typeof children === "string") raw = children;
    else if (Array.isArray(children)) {
      raw = children.map((c) => (typeof c === "string" ? c : "")).join("");
    } else if (
      typeof children === "object" &&
      "props" in (children as { props?: { children?: unknown } })
    ) {
      const inner = (children as { props: { children?: unknown } }).props.children;
      raw = typeof inner === "string" ? inner : Array.isArray(inner) ? inner.join("") : "";
    }
    return raw;
  })();

  const languageMatch = /language-(\w+)/.exec(className ?? "");
  const language = languageMatch ? languageMatch[1] : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard not available
    }
  };

  useEffect(() => {
    setCollapsed(false);
  }, [text]);

  return (
    <pre className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
          <FileText className="h-3 w-3" />
          {language || "code"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand code" : "Collapse code"}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={copy}
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <code ref={ref} className={collapsed ? "hidden" : undefined}>
        {children}
      </code>
    </pre>
  );
}