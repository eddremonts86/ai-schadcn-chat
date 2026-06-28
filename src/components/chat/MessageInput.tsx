/**
 * MessageInput — thin local adapter built on top of the official shadcn
 * `Attachment` component (from `radix-rhea`).
 *
 * The official `shadcn-ui/ui` repo does not ship a `message-input` block
 * itself; instead, the radix docs (message.mdx, attachment.mdx) show
 * consumers composing `Input` + `InputGroup` + `Button` + `Attachment`.
 * This component is the same composition, themed for ai-schadcn-chat:
 *
 *   <textarea> (autosize)
 *     + paperclip trigger → file input → Attachment chips
 *     + send/stop button (calls chat.send / chat.abort)
 *
 * The component is intentionally framework-agnostic at the seams: it
 * accepts `onSend(content, attachments)` for headless use, but also reads
 * from the package's `useChat()` hook when no callback is provided so the
 * demo / one-shot wiring stays trivial.
 */
import {
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useChat } from "../../hooks/useChat.js";
import { defaultModelPresets } from "../../types/presets.js";
import { Button } from "../ui/button.js";
import { Textarea } from "../ui/input.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip.js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover.js";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "./Attachment.js";
import { filesToAttachments } from "../../lib/attachments.js";
import type {
  AttachmentMeta,
  ChatConfig,
  ModelDescriptor,
} from "../../types/chat.js";
import { cn, formatBytes } from "../../lib/utils.js";

export interface MessageInputProps {
  /** Optional headless submit handler. When omitted, the input calls
   *  `useChat().send(text, attachments)`. */
  onSend?: (content: string, attachments: AttachmentMeta[]) => void | Promise<void>;
  /** Streaming state — toggles the trailing button between "send" and "stop". */
  streaming?: boolean;
  /** Disable the input entirely (e.g. while uploading). */
  disabled?: boolean;
  /** Override the trailing button render. */
  renderSendButton?: (props: {
    disabled: boolean;
    onClick: () => void;
  }) => ReactNode;
  /** Extra className on the form. */
  className?: string;
}

export function MessageInput(props: MessageInputProps) {
  const { onSend, streaming, disabled, renderSendButton, className } = props;

  const chat = useChat();
  const cfg = chat.config;
  const ui = cfg.ui ?? {};

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isStreaming = streaming ?? chat.isStreaming;
  const canSend =
    !isStreaming &&
    !disabled &&
    (text.trim().length > 0 || attachments.length > 0);
  const enableFileUpload = ui.enableFileUpload ?? true;

  const presets = useMemo(
    () =>
      Object.values(defaultModelPresets).filter(
        (m) =>
          (cfg.model.provider ?? cfg.provider.kind) ===
          (m.provider ?? cfg.provider.kind),
      ),
    [cfg.model.provider, cfg.provider.kind],
  );

  const submit = async () => {
    if (!canSend) return;
    const t = text.trim();
    setText("");
    const att = attachments;
    setAttachments([]);
    if (onSend) {
      await onSend(t, att);
    } else {
      await chat.send(t, att);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  const onFiles = useCallback(
    async (files: FileList | File[]) => {
      try {
        const list = Array.from(files);
        const atts = await filesToAttachments(list, cfg);
        setAttachments((prev) => [...prev, ...atts]);
      } catch (err) {
        chat.config.onError?.(
          {
            code: "bad_request",
            message:
              (err instanceof Error ? err.message : String(err)) ??
              "File upload failed",
            retryable: false,
          },
          { conversationId: chat.conversationId },
        );
      }
    },
    [cfg, chat.config, chat.conversationId],
  );

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void onFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: ReactDragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) void onFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: ReactDragEvent<HTMLFormElement>) => {
    if (!enableFileUpload) return;
    e.preventDefault();
    setDragOver(true);
  };

  const removeAttachment = (att: AttachmentMeta) => {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
  };

  const switchModel = (modelId: string, label?: string) => {
    const def = defaultModelPresets[modelId] ?? { id: modelId };
    chat.updateConfig({
      model: {
        ...cfg.model,
        id: def.id,
        label: label ?? def.label ?? def.id,
        provider: def.provider ?? cfg.model.provider ?? cfg.provider.kind,
        contextWindow: def.contextWindow ?? cfg.model.contextWindow,
        vision: def.vision ?? cfg.model.vision,
        tools: def.tools ?? cfg.model.tools,
        maxOutput: def.maxOutput ?? cfg.model.maxOutput,
      },
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={cn(
        "border-t bg-background/80 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        dragOver && "ring-2 ring-primary/40",
        className,
      )}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {attachments.length > 0 && (
        <div className="mb-2">
          <AttachmentGroup>
            {attachments.map((att) => (
              <Attachment key={att.id} size="sm" state="done">
                <AttachmentMedia>
                  <FileText className="h-4 w-4" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{att.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {formatBytes(att.size)}
                    {att.mime ? ` · ${att.mime}` : ""}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label="Remove attachment"
                    onClick={() => removeAttachment(att)}
                  >
                    <X className="h-3 w-3" />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </AttachmentGroup>
        </div>
      )}

      <div className="flex items-end gap-2">
        {enableFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              onChange={onFileInput}
              accept={(ui.acceptedFileTypes ?? []).join(",")}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach files"
                  disabled={disabled}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach files (images, PDFs, text)</TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ui.placeholder ?? "Ask anything…"}
            rows={1}
            disabled={disabled}
            className="min-h-[44px] resize-none text-sm"
            onInput={(e) => {
              const target = e.currentTarget;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 240)}px`;
            }}
          />
        </div>

        <ModelSwitcher
          currentModelId={cfg.model.id}
          currentProvider={cfg.model.provider ?? cfg.provider.kind}
          presets={presets}
          onSelect={switchModel}
        />

        {isStreaming ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => chat.abort()}
            aria-label="Stop generating"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : renderSendButton ? (
          renderSendButton({ disabled: !canSend, onClick: () => void submit() })
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {dragOver && (
        <div className="pointer-events-none mt-2 flex items-center justify-center gap-1 rounded border border-dashed border-primary/50 bg-primary/5 p-2 text-xs text-primary">
          <FileText className="h-3 w-3" />
          Drop files to attach
        </div>
      )}
    </form>
  );
}

function ModelSwitcher({
  currentModelId,
  currentProvider,
  presets,
  onSelect,
}: {
  currentModelId: string;
  currentProvider: ChatConfig["provider"]["kind"];
  presets: ModelDescriptor[];
  onSelect: (id: string, label?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    return presets.filter(
      (m) =>
        m.id.toLowerCase().includes(filter.toLowerCase()) ||
        (m.label ?? "").toLowerCase().includes(filter.toLowerCase()),
    );
  }, [presets, filter]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1 px-2 text-xs font-medium"
          aria-label="Select model"
        >
          <span className="max-w-[120px] truncate font-mono text-[11px]">
            {currentModelId}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-2">
          <input
            type="text"
            placeholder="Search models…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 text-xs"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {grouped.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No models found
            </div>
          ) : (
            grouped.map((m) => {
              const active = m.id === currentModelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelect(m.id, m.label);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent/50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.label ?? m.id}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {m.id}
                    </p>
                  </div>
                  {active && (
                    <span className="text-[9px] text-muted-foreground">
                      active
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t p-2 text-[10px] text-muted-foreground">
          Provider: <span className="font-mono">{currentProvider}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* silence unused-import warning when Loader2 is tree-shaken out */
void Loader2;