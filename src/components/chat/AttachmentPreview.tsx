/**
 * AttachmentPreview — a single attachment chip built on the official shadcn
 * `Attachment` block. Renders an image thumbnail (`AttachmentMedia
 * variant="image"`) for image files and a type-specific icon otherwise.
 *
 * Used by both the composer (with a remove action) and the message list
 * (read-only). The `state` prop drives the official component's visuals —
 * `uploading`/`processing` trigger the shimmer on the title.
 */
import {
  File as FileIcon,
  FileCode,
  FileJson,
  FileText,
  FileType,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "./Attachment.js";
import { formatBytes } from "../../lib/utils.js";
import type { AttachmentMeta } from "../../types/chat.js";

function iconFor(mime: string): ComponentType<{ className?: string }> {
  if (mime === "application/pdf") return FileType;
  if (mime === "application/json") return FileJson;
  if (mime.startsWith("text/csv") || mime === "text/csv") return FileCode;
  if (mime.startsWith("text/")) return FileText;
  return FileIcon;
}

function shortType(mime: string): string {
  if (!mime || mime === "application/octet-stream") return "file";
  if (mime.startsWith("image/")) return mime.slice(6).toUpperCase();
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/json") return "JSON";
  if (mime.startsWith("text/")) return mime.slice(5).toUpperCase();
  return mime;
}

export interface AttachmentPreviewProps {
  att: AttachmentMeta;
  state?: "idle" | "uploading" | "processing" | "error" | "done";
  onRemove?: () => void;
}

export function AttachmentPreview({
  att,
  state = "done",
  onRemove,
}: AttachmentPreviewProps) {
  const mime = att.mimeType ?? att.mime ?? "";
  const isImage = mime.startsWith("image/") && Boolean(att.dataUrl);
  const Icon = iconFor(mime);

  return (
    <Attachment
      size="default"
      state={state}
      className="w-56 max-w-full bg-background/60"
    >
      {isImage ? (
        <AttachmentMedia
          variant="image"
          className="size-11 rounded-lg ring-1 ring-border/60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={att.dataUrl} alt={att.name} loading="lazy" />
        </AttachmentMedia>
      ) : (
        <AttachmentMedia className="size-11 rounded-lg text-primary">
          <Icon className="size-5" />
        </AttachmentMedia>
      )}
      <AttachmentContent>
        <AttachmentTitle>{att.name}</AttachmentTitle>
        <AttachmentDescription>
          {formatBytes(att.size)} · {shortType(mime)}
        </AttachmentDescription>
      </AttachmentContent>
      {onRemove && (
        <AttachmentActions>
          <AttachmentAction aria-label="Remove attachment" onClick={onRemove}>
            <X className="size-3.5" />
          </AttachmentAction>
        </AttachmentActions>
      )}
    </Attachment>
  );
}
