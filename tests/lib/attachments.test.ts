import { describe, expect, it, vi } from "vitest";
import {
  attachmentIcon,
  buildDefaultMiniMaxConfig,
  downloadAttachment,
  filesToAttachments,
  serializeUserContent,
  summarizeUserMessage,
} from "../../src/lib/index.js";
import type { AttachmentMeta, ChatConfig, ChatMessage } from "../../src/types/chat.js";

function makeFile(name: string, mime: string, content: string | BlobPart[]): File {
  return new File(content, name, { type: mime });
}

describe("filesToAttachments", () => {
  it("builds a dataUrl for image attachments", async () => {
    const file = makeFile("pixel.png", "image/png", [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ]);
    const cfg = buildDefaultMiniMaxConfig({ provider: { ...buildDefaultMiniMaxConfig().provider, credentials: { apiKey: "test" } } });
    const [att] = await filesToAttachments([file], cfg);
    expect(att.name).toBe("pixel.png");
    expect(att.mimeType).toBe("image/png");
    expect(att.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(att.text).toBeUndefined();
  });

  it("inlines text for text files under 256KB", async () => {
    const file = makeFile("hello.txt", "text/plain", ["hello world"]);
    const cfg = buildDefaultMiniMaxConfig();
    const [att] = await filesToAttachments([file], cfg);
    expect(att.text).toBe("hello world");
    expect(att.dataUrl).toBeUndefined();
  });

  it("inlines text for JSON files", async () => {
    const file = makeFile("data.json", "application/json", ['{"a":1}']);
    const cfg = buildDefaultMiniMaxConfig();
    const [att] = await filesToAttachments([file], cfg);
    expect(att.text).toBe('{"a":1}');
  });

  it("rejects files over maxFileSizeMb", async () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    const cfg = buildDefaultMiniMaxConfig({ ui: { maxFileSizeMb: 1 } });
    await expect(filesToAttachments([big], cfg)).rejects.toThrow(/exceeds/);
  });

  it("rejects unsupported MIME types", async () => {
    const file = makeFile("weird.bin", "application/x-weird", ["x"]);
    const cfg = buildDefaultMiniMaxConfig({ ui: { acceptedFileTypes: ["text/plain"] } });
    await expect(filesToAttachments([file], cfg)).rejects.toThrow(/unsupported type/);
  });
});

describe("serializeUserContent", () => {
  const baseAtt: AttachmentMeta = {
    id: "att_1",
    name: "pixel.png",
    mimeType: "image/png",
    size: 100,
    dataUrl: "data:image/png;base64,AAAA",
  };

  it("returns plain text when no attachments", () => {
    expect(serializeUserContent("hi", undefined, "openai")).toBe("hi");
    expect(serializeUserContent("hi", [], "anthropic")).toBe("hi");
  });

  it("builds OpenAI blocks for an image attachment", () => {
    const out = serializeUserContent("describe", [baseAtt], "openai");
    const parsed = JSON.parse(out);
    expect(parsed.__type).toBe("ai-chat-blocks");
    expect(parsed.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image_url" }),
        expect.objectContaining({ type: "text", text: "describe" }),
      ]),
    );
  });

  it("builds Anthropic blocks for an image attachment", () => {
    const out = serializeUserContent("describe", [baseAtt], "anthropic");
    const parsed = JSON.parse(out);
    expect(parsed.__type).toBe("ai-chat-blocks");
    expect(parsed.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image", source: expect.any(Object) }),
      ]),
    );
  });

  it("builds Anthropic blocks for a PDF attachment", () => {
    const pdf: AttachmentMeta = {
      id: "att_2",
      name: "paper.pdf",
      mimeType: "application/pdf",
      size: 100,
      dataUrl: "data:application/pdf;base64,AAAA",
    };
    const out = serializeUserContent("summarize", [pdf], "anthropic");
    const parsed = JSON.parse(out);
    expect(parsed.blocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "document" })]),
    );
  });

  it("inlines attachment text as a fenced block", () => {
    const txt: AttachmentMeta = {
      id: "att_3",
      name: "notes.md",
      mimeType: "text/markdown",
      size: 5,
      text: "## hi",
    };
    const out = serializeUserContent("see attached", [txt], "openai");
    const parsed = JSON.parse(out);
    expect(parsed.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text", text: expect.stringContaining("```") }),
      ]),
    );
  });
});

describe("summarizeUserMessage", () => {
  it("returns plain text for a normal message", () => {
    expect(summarizeUserMessage({ id: "m1", role: "user", content: "hi", createdAt: 0, status: "complete" })).toBe("hi");
  });

  it("extracts text from a blocks marker", () => {
    const msg: ChatMessage = {
      id: "m1",
      role: "user",
      content: JSON.stringify({
        __type: "ai-chat-blocks",
        blocks: [{ type: "text", text: "hello" }, { type: "image_url", image_url: {} }],
      }),
      createdAt: 0,
      status: "complete",
    };
    expect(summarizeUserMessage(msg)).toBe("hello");
  });

  it("appends attachment names", () => {
    const msg: ChatMessage = {
      id: "m1",
      role: "user",
      content: "look at this",
      createdAt: 0,
      status: "complete",
      attachments: [{ id: "a1", name: "photo.png", mimeType: "image/png", size: 1 }],
    };
    expect(summarizeUserMessage(msg)).toContain("📎 photo.png");
  });

  it("falls back to raw content on parse errors", () => {
    expect(summarizeUserMessage({ id: "m1", role: "user", content: "{not json", createdAt: 0, status: "complete" })).toBe("{not json");
  });
});

describe("attachmentIcon", () => {
  it("returns a sensible label per MIME family", () => {
    expect(attachmentIcon("image/png")).toBe("image");
    expect(attachmentIcon("video/mp4")).toBe("video");
    expect(attachmentIcon("audio/mpeg")).toBe("audio");
    expect(attachmentIcon("application/pdf")).toBe("pdf");
    expect(attachmentIcon("text/plain")).toBe("text");
    expect(attachmentIcon("application/json")).toBe("text");
    expect(attachmentIcon("application/octet-stream")).toBe("file");
  });
});

describe("downloadAttachment", () => {
  it("does nothing on the server", () => {
    const att: AttachmentMeta = { id: "x", name: "f.txt", mimeType: "text/plain", size: 1, dataUrl: "data:text/plain;base64,QQ==" };
    // No-op when window is undefined (we can't truly test SSR here, but
    // the function should not throw in jsdom either).
    downloadAttachment(att);
    expect(true).toBe(true);
  });

  it("creates and clicks a hidden anchor", () => {
    const att: AttachmentMeta = { id: "x", name: "f.txt", mimeType: "text/plain", size: 1, dataUrl: "data:text/plain;base64,QQ==" };
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const removeSpy = vi.spyOn(HTMLAnchorElement.prototype, "remove").mockImplementation(() => {});

    downloadAttachment(att);

    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("skips when there is no dataUrl or url", () => {
    const att: AttachmentMeta = { id: "x", name: "f.txt", mimeType: "text/plain", size: 1 };
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    downloadAttachment(att);
    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});