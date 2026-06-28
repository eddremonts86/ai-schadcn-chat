/**
 * Renders a list of attachments as compact chips inside a message bubble.
 * Images preview inline; other files show an icon + name + size.
 */
import {
  Download,
  File,
  FileImage,
  FileText,
  Music,
  Video,
  X,
} from "lucide-react";
import { Button } from "../ui/button.js";
import { attachmentIcon, downloadAttachment } from "../../lib/attachments.js";
import type { AttachmentMeta } from "../../types/chat.js";
import { cn, formatBytes } from "../../lib/utils.js";

export interface AttachmentChipsProps {
  attachments: AttachmentMeta[];
  className?: string;
  /** When true, renders a remove button per chip. */
  onRemove?: (attachment: AttachmentMeta) => void;
}

export function AttachmentChips({ attachments, className, onRemove }: AttachmentChipsProps) {
  if (!attachments?.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {attachments.map((att) => (
        <AttachmentChip key={att.id} att={att} onRemove={onRemove} />
      ))}
    </div>
  );
}

function AttachmentChip({
  att,
  onRemove,
}: {
  att: AttachmentMeta;
  onRemove?: (a: AttachmentMeta) => void;
}) {
  const isImage = att.mimeType.startsWith("image/");
  return (
    <div
      className={cn(
        "group relative flex max-w-[260px] items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-xs",
        isImage && "p-1",
      )}
    >
      {isImage && att.dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={att.dataUrl}
          alt={att.name}
          className="h-12 w-12 rounded object-cover"
        />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded bg-background">
          <AttachmentIcon mimeType={att.mimeType} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{att.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {formatBytes(att.size)} · {att.mimeType}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => downloadAttachment(att)}
        aria-label={`Download ${att.name}`}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onRemove(att)}
          aria-label={`Remove ${att.name}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  const kind = attachmentIcon(mimeType);
  switch (kind) {
    case "image":
      return <FileImage className="h-3.5 w-3.5" />;
    case "video":
      return <Video className="h-3.5 w-3.5" />;
    case "audio":
      return <Music className="h-3.5 w-3.5" />;
    case "pdf":
      return <FileText className="h-3.5 w-3.5" />;
    case "text":
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <File className="h-3.5 w-3.5" />;
  }
}