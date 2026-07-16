import { afterEach, describe, expect, it, vi } from "vitest";
import { ChromeAIProvider, chromeAiAvailability } from "../../src/providers/chrome.js";
import { buildDefaultChromeConfig } from "../../src/types/presets.js";
import type { ChatMessage, ChatResponseChunk } from "../../src/types/chat.js";

type Availability = "available" | "downloadable" | "downloading" | "unavailable";

/** Install a fake `LanguageModel` global mirroring the Prompt API surface. */
function stubLanguageModel(opts: {
  availability?: Availability;
  chunks?: string[];
  onCreate?: (o: unknown) => void;
  promptSignal?: () => AbortSignal | undefined;
}): void {
  const chunks = opts.chunks ?? [];
  const lm = {
    availability: vi.fn(async () => opts.availability ?? "available"),
    create: vi.fn(async (o: unknown) => {
      opts.onCreate?.(o);
      return {
        promptStreaming(_input: string, po?: { signal?: AbortSignal }) {
          return (async function* () {
            for (const c of chunks) {
              if (po?.signal?.aborted) return;
              yield c;
            }
          })();
        },
        destroy: vi.fn(),
      };
    }),
  };
  vi.stubGlobal("LanguageModel", lm);
}

function userMsg(content: string): ChatMessage {
  return { id: "m1", role: "user", content, createdAt: 0, status: "complete" };
}

async function drain(iter: AsyncIterable<ChatResponseChunk>): Promise<ChatResponseChunk[]> {
  const out: ChatResponseChunk[] = [];
  for await (const c of iter) out.push(c);
  return out;
}

describe("ChromeAIProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("yields an error chunk when the LanguageModel global is absent", async () => {
    // No stub: global is undefined.
    const provider = new ChromeAIProvider();
    const chunks = await drain(provider.stream({ messages: [userMsg("hi")] }, buildDefaultChromeConfig()));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].finishReason).toBe("error");
    expect(chunks[0].error?.message).toContain("Chrome");
  });

  it("yields an error chunk when availability is unavailable", async () => {
    stubLanguageModel({ availability: "unavailable" });
    const provider = new ChromeAIProvider();
    const chunks = await drain(provider.stream({ messages: [userMsg("hi")] }, buildDefaultChromeConfig()));
    expect(chunks.at(-1)?.finishReason).toBe("error");
  });

  it("streams deltas then a stop finish reason when available", async () => {
    stubLanguageModel({ availability: "available", chunks: ["Hello ", "world"] });
    const provider = new ChromeAIProvider();
    const chunks = await drain(provider.stream({ messages: [userMsg("hi")] }, buildDefaultChromeConfig()));
    const text = chunks.filter((c) => c.delta).map((c) => c.delta).join("");
    expect(text).toBe("Hello world");
    expect(chunks.at(-1)).toMatchObject({ finishReason: "stop", model: "gemini-nano" });
  });

  it("passes the system prompt and prior turns as initialPrompts, last user as the prompt", async () => {
    let created: { initialPrompts?: { role: string; content: string }[] } | undefined;
    stubLanguageModel({
      availability: "available",
      chunks: ["ok"],
      onCreate: (o) => {
        created = o as typeof created;
      },
    });
    const cfg = buildDefaultChromeConfig({ systemPrompt: "Be terse." });
    const provider = new ChromeAIProvider();
    const messages: ChatMessage[] = [
      { id: "a", role: "user", content: "first", createdAt: 0, status: "complete" },
      { id: "b", role: "assistant", content: "reply", createdAt: 1, status: "complete" },
      { id: "c", role: "user", content: "second", createdAt: 2, status: "complete" },
    ];
    await drain(provider.stream({ messages }, cfg));
    const roles = created?.initialPrompts?.map((p) => `${p.role}:${p.content}`) ?? [];
    expect(roles).toContain("system:Be terse.");
    expect(roles).toContain("user:first");
    expect(roles).toContain("assistant:reply");
    // The last user message is the streamed prompt, not part of initialPrompts.
    expect(roles).not.toContain("user:second");
  });

  it("surfaces a download notice when the model is downloadable", async () => {
    stubLanguageModel({ availability: "downloadable", chunks: ["hi"] });
    const provider = new ChromeAIProvider();
    const chunks = await drain(provider.stream({ messages: [userMsg("hi")] }, buildDefaultChromeConfig()));
    expect(chunks.some((c) => c.delta?.includes("think:"))).toBe(true);
  });

  it("abort() stops the stream", async () => {
    stubLanguageModel({ availability: "available", chunks: ["a", "b", "c"] });
    const provider = new ChromeAIProvider();
    const controller = new AbortController();
    controller.abort();
    const chunks = await drain(provider.stream({ messages: [userMsg("hi")], signal: controller.signal }, buildDefaultChromeConfig()));
    const text = chunks.filter((c) => c.delta).map((c) => c.delta).join("");
    expect(text).toBe("");
  });
});

describe("chromeAiAvailability", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns 'unavailable' when the global is missing", async () => {
    expect(await chromeAiAvailability()).toBe("unavailable");
  });

  it("returns the reported availability when present", async () => {
    stubLanguageModel({ availability: "downloadable" });
    expect(await chromeAiAvailability()).toBe("downloadable");
  });
});
