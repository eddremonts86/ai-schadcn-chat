/**
 * Markdown — renders assistant/tool message content as rich GitHub-flavored
 * Markdown with syntax-highlighted code blocks (copy + language label),
 * tables, links, and lists.
 *
 * Pipeline: react-markdown + remark-gfm (tables/strikethrough/autolinks) +
 * rehype-raw (inline HTML) + rehype-highlight (highlight.js token classes,
 * themed in globals.css). The renderer is memoized so re-renders during
 * streaming only re-parse when the text actually changes.
 *
 * Styling: when `typeset` is set, the container gets `typeset` + the chosen
 * preset class + CSS variables for any rhythm overrides. When omitted or
 * `enabled === false`, we fall back to `ai-prose` so existing consumers see
 * no change. Either way, the per-element classes in `components` below still
 * apply — Tailwind utilities win specificity over typeset's `:where()` rules.
 */
import { Check, Copy } from "lucide-react";
import { memo, useState, type CSSProperties, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Button } from "../ui/button.js";
import { cn } from "../../lib/utils.js";
import type { TypesetConfig } from "../../types/chat.js";

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label="Copy code"
      onClick={() => {
        try {
          void navigator.clipboard?.writeText(getText());
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
    >
      {copied ? (
        <>
          <Check className="size-3 text-success" /> Copied
        </>
      ) : (
        <>
          <Copy className="size-3" /> Copy
        </>
      )}
    </Button>
  );
}

function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return nodeToText(props?.children);
  }
  return "";
}

export interface MarkdownProps {
  children: string;
  className?: string;
  /**
   * Optional typeset styling. When provided, the container becomes a
   * `.typeset` element with the chosen preset + rhythm overrides. When
   * undefined, the container falls back to the package's `ai-prose` class
   * (the look every chat shipped with before this feature).
   *
   * The consumer app typically wires this from `config.ui.typeset` via the
   * parent component. Passing it directly is supported for callers that
   * want to bypass config plumbing (custom renderers, tests).
   */
  typeset?: TypesetConfig;
}

/**
 * Resolves which CSS class + inline style the markdown container should use.
 * Pure function, exported for unit tests.
 */
export function typesetClassName(typeset: TypesetConfig | undefined): string {
  if (!typeset || typeset.enabled === false) {
    // Legacy look. Keep the same class so existing snapshots stay stable.
    return cn("ai-prose", "text-[0.9375rem] leading-relaxed");
  }
  const presetClass =
    typeset.preset && typeset.preset !== "default" ? `typeset-${typeset.preset}` : "typeset";
  return cn(presetClass, "text-[var(--typeset-size)]");
}

export function typesetInlineStyle(typeset: TypesetConfig | undefined): CSSProperties | undefined {
  if (!typeset || typeset.enabled === false) return undefined;
  const vars: Record<string, string | number> = {};
  if (typeset.size) vars["--typeset-size"] = typeset.size;
  if (typeof typeset.leading === "number") vars["--typeset-leading"] = typeset.leading;
  if (typeset.flow) vars["--typeset-flow"] = typeset.flow;
  if (typeset.fontBody) vars["--typeset-font-body"] = typeset.fontBody;
  if (typeset.fontHeading) vars["--typeset-font-heading"] = typeset.fontHeading;
  if (typeset.fontMono) vars["--typeset-font-mono"] = typeset.fontMono;
  return Object.keys(vars).length > 0 ? (vars as CSSProperties) : undefined;
}

export const Markdown = memo(function Markdown({
  children,
  className,
  typeset,
}: MarkdownProps) {
  const containerClass = typesetClassName(typeset);
  const containerStyle = typesetInlineStyle(typeset);
  return (
    <div
      className={cn(containerClass, className)}
      style={containerStyle}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          p: ({ children }) => <p className="my-2.5">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
              className="my-2 h-auto max-h-80 max-w-full rounded-xl border border-border object-contain"
            />
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 list-disc space-y-1 pl-5 marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 list-decimal space-y-1 pl-5 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 text-lg font-semibold tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-semibold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-sm font-semibold tracking-tight">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-r-md border-l-2 border-primary/40 bg-primary/5 py-1 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-3 py-2 align-top">
              {children}
            </td>
          ),
          code: ({ className: cls, children, ...props }) => {
            const isBlock = /language-/.test(cls ?? "");
            if (!isBlock) {
              return (
                <code
                  className="rounded-md border border-border/70 bg-muted/70 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={cls} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            const lang = extractLang(children);
            return (
              <div className="group/code my-3 overflow-hidden rounded-xl border border-border bg-[oklch(0.16_0.02_285)] shadow-sm">
                <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-white/50">
                    {lang || "code"}
                  </span>
                  <CopyButton getText={() => nodeToText(children)} />
                </div>
                <pre className="overflow-x-auto px-4 py-3 text-[0.8125rem] leading-relaxed text-white/90 [&_code]:bg-transparent [&_code]:p-0">
                  {children}
                </pre>
              </div>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});

function extractLang(children: ReactNode): string {
  // <pre><code class="hljs language-ts">…
  const child = Array.isArray(children) ? children[0] : children;
  const cls =
    (child &&
      typeof child === "object" &&
      "props" in child &&
      (child as { props?: { className?: string } }).props?.className) ||
    "";
  const m = /language-([\w-]+)/.exec(cls);
  return m ? m[1] : "";
}
