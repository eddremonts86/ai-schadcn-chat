import type { AttachmentMeta, ChatConfig, ChatMessage } from "../types/chat.js";
import { formatBytes, readFileAsDataUrl, readFileAsText, uid } from "./utils.js";
import { buildAnthropicUserContent } from "../providers/anthropic.js";
import { buildOpenAIUserContent } from "../providers/openai.js";

/**
 * Convert a list of browser File objects into AttachmentMeta records.
 * Large text files (.md/.txt/.csv/.json) are read as text for cheap
 * context-injection. Binary files are stored as data URLs for vision
 * models (subject to the cfg.ui.maxFileSizeMb cap).
 */
export async function filesToAttachments(
  files: File[],
  cfg: ChatConfig,
): Promise<AttachmentMeta[]> {
  const maxBytes = (cfg.ui?.maxFileSizeMb ?? 10) * 1024 * 1024;
  const accepted = new Set<string>(
    cfg.ui?.acceptedFileTypes ?? [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ],
  );

  const out: AttachmentMeta[] = [];
  for (const file of files) {
    if (file.size > maxBytes) {
      throw new Error(
        `${file.name} is ${formatBytes(file.size)} — exceeds the ${formatBytes(maxBytes)} limit`,
      );
    }
    if (accepted.size > 0 && !accepted.has(file.type)) {
      throw new Error(`${file.name} has unsupported type ${file.type || "unknown"}`);
    }
    const att: AttachmentMeta = {
      id: uid("att"),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    };
    if (file.type.startsWith("text/") || file.type === "application/json") {
      att.text = await readFileAsText(file);
    } else {
      att.dataUrl = await readFileAsDataUrl(file);
    }
    out.push(att);
  }
  return out;
}

/**
 * Serialize a (text, attachments) tuple into the structured user content
 * the provider adapters recognize. Returns either a plain string (most
 * turns) or a JSON-encoded marker (`{__type:"ai-chat-blocks",blocks:[...]}`).
 *
 * Adapters inspect the marker and expand it into native content blocks.
 */
export function serializeUserContent(
  text: string,
  attachments: AttachmentMeta[] | undefined,
  providerKind: ChatConfig["provider"]["kind"],
): string {
  if (!attachments?.length) return text;
  const provider = providerKind;
  if (provider === "anthropic") {
    const blocks = buildAnthropicUserContent({ text, attachments });
    if (!blocks.length) return text;
    return JSON.stringify({ __type: "ai-chat-blocks", blocks });
  }
  // OpenAI / openai-compatible share the same multimodal format.
  const blocks = buildOpenAIUserContent({ text, attachments });
  if (!blocks.length) return text;
  return JSON.stringify({ __type: "ai-chat-blocks", blocks });
}

/**
 * Download an attachment by triggering a synthetic anchor click.
 * Used for "Download" buttons next to each file chip in the UI.
 */
export function downloadAttachment(att: AttachmentMeta): void {
  if (typeof document === "undefined") return;
  const href = att.dataUrl ?? att.url;
  if (!href) return;
  const a = document.createElement("a");
  a.href = href;
  a.download = att.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Friendly preview thumbnail for non-image attachments.
 */
export function attachmentIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/") || mimeType === "application/json") return "text";
  return "file";
}

/**
 * Extract the human-readable text from a message's `content`. When the
 * content is the internal `ai-chat-blocks` JSON marker (used when a turn
 * carries attachments), the text blocks are concatenated and the binary
 * image/file blocks are dropped — so the UI never renders raw JSON. Plain
 * content is returned unchanged.
 */
export function extractMessageText(content: string): string {
  if (!content.startsWith("{")) return content;
  try {
    const parsed = JSON.parse(content) as {
      __type?: string;
      blocks?: { type?: string; text?: string }[];
    };
    if (parsed?.__type === "ai-chat-blocks" && Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .map((b) => (b.type === "text" && typeof b.text === "string" ? b.text : ""))
        .filter(Boolean)
        .join("\n")
        .trim();
    }
  } catch {
    /* fall through — not a blocks marker */
  }
  return content;
}

/**
 * Reconstruct a plain-text representation of a user message:
 * strips the JSON marker, surfaces attachment names, and returns the
 * raw text the user typed. Used by the on-screen header.
 */
export function summarizeUserMessage(msg: ChatMessage): string {
  let text = msg.content;
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed?.__type === "ai-chat-blocks" && Array.isArray(parsed.blocks)) {
        text = parsed.blocks
          .map((b: { type?: string; text?: string }) =>
            b?.type === "text" && typeof b.text === "string" ? b.text : "",
          )
          .filter(Boolean)
          .join("\n");
      }
    } catch {
      // fall through
    }
  }
  const names = (msg.attachments ?? []).map((a) => a.name).join(", ");
  return names ? `${text}\n\n📎 ${names}` : text;
}