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
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Settings2,
  Square,
  X,
} from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useChat } from "../../hooks/useChat.js";
import {
  getActiveProviderId,
  listProviders,
  profileToConfig,
  setActiveProviderId,
} from "../../lib/providers.js";
import { ProviderManager } from "./ProviderManager.js";
import { Button } from "../ui/button.js";
import { Input, Textarea } from "../ui/input.js";
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
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "./Attachment.js";
import { AttachmentPreview } from "./AttachmentPreview.js";
import { filesToAttachments } from "../../lib/attachments.js";
import type {
  AttachmentMeta,
  ModelDescriptor,
  ProviderProfile,
} from "../../types/chat.js";
import { cn } from "../../lib/utils.js";

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
  /** Extra className on the inner content wrapper (the composer card and hint
   *  text), merged over the default `max-w-3xl` via tailwind-merge. Use this
   *  to let the composer use more horizontal space in wide layouts. */
  contentClassName?: string;
}

export function MessageInput(props: MessageInputProps) {
  const { onSend, streaming, disabled, renderSendButton, className, contentClassName } = props;

  const chat = useChat();
  const cfg = chat.config;
  const ui = cfg.ui ?? {};

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastHeightRef = useRef(0);

  // Autosize: grow with content up to a max (then scroll), and collapse back to
  // the single-row height whenever the text is cleared (e.g. after sending).
  // Runs on every `text` change so programmatic resets are handled too. To let
  // the CSS height transition animate, we measure against `auto`, then restore
  // the previous height and force a reflow so the browser tweens prev → next
  // instead of committing the measured `auto` height as the start value.
  const MAX_TEXTAREA_HEIGHT = 200;
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const prev = lastHeightRef.current;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
    if (prev && prev !== next) {
      el.style.height = `${prev}px`;
      void el.offsetHeight; // commit the base height so the transition has a start
    }
    el.style.height = `${next}px`;
    lastHeightRef.current = next;
  }, [text]);

  const isStreaming = streaming ?? chat.isStreaming;
  const canSend =
    !isStreaming &&
    !disabled &&
    (text.trim().length > 0 || attachments.length > 0);
  const enableFileUpload = ui.enableFileUpload ?? true;

  const [providerMgrOpen, setProviderMgrOpen] = useState(false);
  const [providerMgrCreate, setProviderMgrCreate] = useState(false);
  const [activeProviderId, setActiveProvider] = useState<string | null>(() =>
    getActiveProviderId(),
  );

  const applyProvider = (profile: ProviderProfile, model?: ModelDescriptor) => {
    // Don't clobber a working key with an empty one: if the profile has no key
    // but points at the same endpoint that's already configured (e.g. the key
    // came from env), reuse the live credentials.
    const current = chat.config.provider;
    const effectiveKey =
      profile.apiKey ||
      (current.baseUrl === profile.baseUrl
        ? (current.credentials?.apiKey ?? "")
        : "");
    chat.updateConfig(
      profileToConfig({ ...profile, apiKey: effectiveKey }, model),
    );
    setActiveProviderId(profile.id);
    setActiveProvider(profile.id);
  };

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
      const list = Array.from(files);
      setUploadingCount((n) => n + list.length);
      try {
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
      } finally {
        setUploadingCount((n) => Math.max(0, n - list.length));
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

  const openProviderMgr = (create: boolean) => {
    setProviderMgrCreate(create);
    setProviderMgrOpen(true);
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={cn(
        "relative z-10 px-3 pb-3 pt-2 sm:px-4 sm:pb-4",
        className,
      )}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-3xl rounded-2xl border bg-card/80 p-2 backdrop-blur-xl transition-[box-shadow,border-color] duration-200",
          "border-border/70 shadow-[0_2px_8px_-4px_oklch(var(--foreground)/0.1)]",
          "focus-within:border-primary/50 focus-within:shadow-[0_0_0_1px_oklch(var(--primary)/0.35),0_10px_30px_-12px_oklch(var(--glow)/0.5)]",
          dragOver && "border-primary/60 ring-2 ring-primary/30",
          contentClassName,
        )}
      >
        {(attachments.length > 0 || uploadingCount > 0) && (
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto px-1 pb-2 pt-1 scrollbar-thin">
            {attachments.map((att) => (
              <AttachmentPreview
                key={att.id}
                att={att}
                onRemove={() => removeAttachment(att)}
              />
            ))}
            {Array.from({ length: uploadingCount }).map((_, i) => (
              <Attachment key={`uploading-${i}`} size="sm" state="uploading">
                <AttachmentMedia>
                  <Loader2 className="size-4 animate-spin" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Uploading…</AttachmentTitle>
                  <AttachmentDescription>reading file</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5">
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
                    className="size-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach files"
                    disabled={disabled}
                  >
                    <Paperclip className="size-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Attach files (images, PDFs, text)
                </TooltipContent>
              </Tooltip>
            </>
          )}

          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ui.placeholder ?? "Ask anything…"}
            rows={1}
            disabled={disabled}
            className="max-h-[200px] min-h-[40px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2 text-[0.9375rem] shadow-none scrollbar-thin transition-[height] duration-150 ease-out focus-visible:ring-0 focus-visible:ring-offset-0 motion-reduce:transition-none"
          />

          <ModelSwitcher
            currentModelId={cfg.model.id}
            activeProviderId={activeProviderId}
            onPick={applyProvider}
            onManage={() => openProviderMgr(false)}
          />

          {isStreaming ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="size-9 shrink-0 rounded-xl"
              onClick={() => chat.abort()}
              aria-label="Stop generating"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : renderSendButton ? (
            renderSendButton({
              disabled: !canSend,
              onClick: () => void submit(),
            })
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                "size-9 shrink-0 rounded-xl border-0 text-primary-foreground transition-all",
                canSend
                  ? "grad-primary glow-primary hover:brightness-110"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className={cn("mx-auto mt-2 max-w-3xl px-1 text-center text-[11px] text-muted-foreground/70", contentClassName)}>
        Press{" "}
        <kbd className="rounded border border-border/70 bg-muted/60 px-1 font-sans text-[10px]">
          Enter
        </kbd>{" "}
        to send ·{" "}
        <kbd className="rounded border border-border/70 bg-muted/60 px-1 font-sans text-[10px]">
          Shift+Enter
        </kbd>{" "}
        for a new line
      </p>

      {dragOver && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 text-sm font-medium text-primary backdrop-blur-sm">
          <FileText className="size-4" />
          Drop files to attach
        </div>
      )}

      <ProviderManager
        open={providerMgrOpen}
        onOpenChange={setProviderMgrOpen}
        activeProviderId={activeProviderId}
        onApply={(p) => applyProvider(p)}
        startInCreate={providerMgrCreate}
      />
    </form>
  );
}

function ModelSwitcher({
  currentModelId,
  activeProviderId,
  onPick,
  onManage,
}: {
  currentModelId: string;
  activeProviderId: string | null;
  onPick: (profile: ProviderProfile, model: ModelDescriptor) => void;
  onManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const providers = useMemo(() => (open ? listProviders() : []), [open]);

  const f = filter.toLowerCase();
  const groups = providers
    .map((p) => ({
      provider: p,
      models: p.models.filter(
        (m) =>
          !f ||
          m.id.toLowerCase().includes(f) ||
          (m.label ?? "").toLowerCase().includes(f) ||
          p.name.toLowerCase().includes(f),
      ),
    }))
    .filter((g) => g.models.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden h-9 shrink-0 gap-1 rounded-xl border border-border/60 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
          aria-label="Select model"
        >
          <span className="max-w-[120px] truncate font-mono text-[11px]">
            {currentModelId || "Select model"}
          </span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-2">
          <Input
            type="text"
            placeholder="Search providers & models…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {groups.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No models found
            </div>
          ) : (
            groups.map(({ provider, models }) => (
              <div key={provider.id} className="mb-1">
                <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="text-sm leading-none">{provider.icon}</span>
                  {provider.name}
                  {!provider.apiKey && (
                    <span className="rounded bg-muted px-1 text-[8px] normal-case text-muted-foreground/70">
                      no key
                    </span>
                  )}
                </p>
                {models.map((m) => {
                  const active =
                    m.id === currentModelId && provider.id === activeProviderId;
                  return (
                    <Button
                      key={`${provider.id}:${m.id}`}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        onPick(provider, m);
                        setOpen(false);
                      }}
                      className={cn(
                        "h-auto w-full justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs font-normal",
                        active && "bg-accent/50",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {m.label ?? m.id}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">
                          {m.id}
                        </span>
                      </span>
                      {active && <Check className="size-3.5 shrink-0 text-primary" />}
                    </Button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="h-8 w-full justify-start gap-2 rounded-sm px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="size-3.5" />
            Manage providers &amp; models…
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}