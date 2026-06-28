import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAIProvider } from "../../src/providers/openai.js";
import {
  buildOpenAIUserContent,
} from "../../src/providers/openai.js";
import { buildDefaultMiniMaxConfig } from "../../src/types/presets.js";
import type { ChatMessage } from "../../src/types/chat.js";

/**
 * Build a ReadableStream<Uint8Array> from a list of string chunks.
 * Each chunk is encoded as UTF-8 and enqueued separately so the SSE parser
 * exercises its buffer boundary logic.
 */
function sseStreamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
      }
      controller.close();
    },
  });
}

describe("OpenAIProvider — request body", () => {
  it("produces a body with model, messages, and stream:true", async () => {
    let captured: { url: string; headers: Record<string, string>; body: string } | undefined;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      captured = {
        url,
        headers: init.headers as Record<string, string>,
        body: init.body as string,
      };
      return new Response(
        sseStreamFrom(["data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n", "data: [DONE]\n\n"]),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const cfg = buildDefaultMiniMaxConfig({ model: { id: "gpt-4o-mini", label: "gpt-4o-mini", provider: "openai-compatible" } });
    const provider = new OpenAIProvider("openai-compatible");
    const messages: ChatMessage[] = [{ id: "m1", role: "user", content: "hi", createdAt: 0, status: "complete" }];

    const stream = provider.stream({ messages }, cfg);
    // Drain the stream so the fetch is called.
    for await (const _ of stream) {
      // noop
    }

    expect(captured).toBeDefined();
    const parsed = JSON.parse(captured!.body);
    expect(parsed.model).toBe("gpt-4o-mini");
    expect(parsed.stream).toBe(true);
    expect(Array.isArray(parsed.messages)).toBe(true);
    // The default config injects a system message; verify both are present.
    const roles = parsed.messages.map((m: { role: string }) => m.role);
    expect(roles).toContain("system");
    expect(roles).toContain("user");
    const userMsg = parsed.messages.find((m: { role: string }) => m.role === "user");
    expect(userMsg.content).toBe("hi");
  });

  it("sends temperature and top_p when set", async () => {
    let captured: { body: string } | undefined;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      captured = { body: init.body as string };
      return new Response(sseStreamFrom(["data: [DONE]\n\n"]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const cfg = buildDefaultMiniMaxConfig({ temperature: 0.3, topP: 0.8 });
    const provider = new OpenAIProvider("openai-compatible");
    for await (const _ of provider.stream({ messages: [] }, cfg)) {
      // drain
    }
    const body = JSON.parse(captured!.body);
    expect(body.temperature).toBe(0.3);
    expect(body.top_p).toBe(0.8);
  });

  it("omits tools when none configured", async () => {
    let captured: { body: string } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        captured = { body: init.body as string };
        return new Response(sseStreamFrom(["data: [DONE]\n\n"]), { status: 200 });
      }),
    );
    const provider = new OpenAIProvider("openai-compatible");
    for await (const _ of provider.stream({ messages: [] }, buildDefaultMiniMaxConfig())) {
      // drain
    }
    expect(JSON.parse(captured!.body).tools).toBeUndefined();
  });

  it("encodes tool definitions when configured", async () => {
    let captured: { body: string } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        captured = { body: init.body as string };
        return new Response(sseStreamFrom(["data: [DONE]\n\n"]), { status: 200 });
      }),
    );
    const cfg = buildDefaultMiniMaxConfig({
      tools: [
        {
          name: "ping",
          description: "ping a target",
          parameters: { type: "object", properties: { target: { type: "string" } } },
        },
      ],
    });
    const provider = new OpenAIProvider("openai-compatible");
    for await (const _ of provider.stream({ messages: [] }, cfg)) {
      // drain
    }
    const body = JSON.parse(captured!.body);
    expect(body.tools).toEqual([
      {
        type: "function",
        function: {
          name: "ping",
          description: "ping a target",
          parameters: { type: "object", properties: { target: { type: "string" } } },
        },
      },
    ]);
  });
});

describe("OpenAIProvider — SSE parsing", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(sseStreamFrom([]), { status: 200 })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function* streamOf(events: string[]) {
    const provider = new OpenAIProvider("openai-compatible");
    // Bypass fetch: use parseStream directly with a hand-rolled stream.
    for await (const c of (provider as unknown as {
      parseStream: (b: ReadableStream<Uint8Array>, s: AbortSignal) => AsyncGenerator<unknown>;
    }).parseStream(sseStreamFrom(events), new AbortController().signal)) {
      yield c;
    }
  }

  it("extracts text from delta.content", async () => {
    const chunks: unknown[] = [];
    for await (const c of streamOf([
      'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"world"}}]}\n\n',
      'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
    ])) {
      chunks.push(c);
    }
    expect(chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ delta: "Hello " }),
        expect.objectContaining({ delta: "world" }),
        expect.objectContaining({ finishReason: "stop" }),
      ]),
    );
  });

  it("extracts tool_calls", async () => {
    const chunks: unknown[] = [];
    for await (const c of streamOf([
      'data: {"choices":[{"delta":{"tool_calls":[{"id":"t1","function":{"name":"ping","arguments":"{\\"a\\":1}"}}]}}]}\n\n',
      'data: [DONE]\n\n',
    ])) {
      chunks.push(c);
    }
    const tcChunks = chunks.filter((c) => (c as { toolCall?: unknown }).toolCall);
    expect(tcChunks).toHaveLength(1);
    expect(tcChunks[0]).toEqual(
      expect.objectContaining({
        toolCall: expect.objectContaining({
          id: "t1",
          name: "ping",
          arguments: '{"a":1}',
        }),
      }),
    );
  });

  it("encodes reasoning_content as a thinking marker (engine strips it)", async () => {
    const chunks: unknown[] = [];
    for await (const c of streamOf([
      'data: {"choices":[{"delta":{"reasoning_content":"thinking step"}}]}\n\n',
      'data: [DONE]\n\n',
    ])) {
      chunks.push(c);
    }
    expect(chunks).toEqual(
      expect.arrayContaining([expect.objectContaining({ delta: expect.stringContaining("think:") })]),
    );
  });
});

describe("OpenAIProvider — retry / backoff on 429", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries after a rate-limit then succeeds", async () => {
    let attempt = 0;
    const fetchMock = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        return new Response("rate limited", { status: 429 });
      }
      return new Response(
        sseStreamFrom([
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
          'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const cfg = buildDefaultMiniMaxConfig({
      retry: { attempts: 3, initialDelayMs: 10, maxDelayMs: 100 },
    });
    const provider = new OpenAIProvider("openai-compatible");
    const out: string[] = [];
    for await (const c of provider.stream({ messages: [{ id: "m1", role: "user", content: "hi", createdAt: 0, status: "complete" }] }, cfg)) {
      if ((c as { delta?: string }).delta) out.push((c as { delta: string }).delta);
    }
    expect(out.join("")).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after attempts are exhausted on 5xx", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const cfg = buildDefaultMiniMaxConfig({
      retry: { attempts: 2, initialDelayMs: 10, maxDelayMs: 50 },
    });
    const provider = new OpenAIProvider("openai-compatible");
    await expect(async () => {
      for await (const _ of provider.stream({ messages: [] }, cfg)) {
        // drain
      }
    }).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("buildOpenAIUserContent", () => {
  it("emits image_url for image attachments", () => {
    const blocks = buildOpenAIUserContent({
      text: "describe",
      attachments: [
        {
          id: "a1",
          name: "p.png",
          mimeType: "image/png",
          size: 1,
          dataUrl: "data:image/png;base64,AAAA",
        },
      ],
    });
    expect(blocks).toEqual(
      expect.arrayContaining([
        { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
        { type: "text", text: "describe" },
      ]),
    );
  });

  it("uses url when only url is provided", () => {
    const blocks = buildOpenAIUserContent({
      text: "x",
      attachments: [{ id: "a1", name: "p.png", mimeType: "image/png", size: 1, url: "https://x/p.png" }],
    });
    expect(blocks).toEqual(
      expect.arrayContaining([{ type: "image_url", image_url: { url: "https://x/p.png" } }]),
    );
  });

  it("wraps text attachments in a fenced block", () => {
    const blocks = buildOpenAIUserContent({
      text: "see",
      attachments: [{ id: "a1", name: "n.md", mimeType: "text/markdown", size: 4, text: "# hi" }],
    });
    const txtBlock = blocks.find((b) => (b as { type: string }).type === "text") as { text: string };
    expect(txtBlock.text).toContain("```");
    expect(txtBlock.text).toContain("# hi");
  });
});