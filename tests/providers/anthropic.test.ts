import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnthropicProvider, buildAnthropicUserContent } from "../../src/providers/anthropic.js";
import { buildDefaultMiniMaxConfig } from "../../src/types/presets.js";
import type { ChatConfig } from "../../src/types/chat.js";

function sseStreamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

function anthropicConfig(overrides: Partial<ChatConfig> = {}): ChatConfig {
  return buildDefaultMiniMaxConfig({
    provider: {
      kind: "anthropic",
      baseUrl: "https://api.anthropic.com",
      authHeader: "x-api-key",
      credentials: { apiKey: "test-key" },
      chatPath: "/v1/messages",
    },
    model: {
      id: "claude-3-5-haiku-latest",
      label: "claude-3-5-haiku-latest",
      provider: "anthropic",
      maxOutput: 1024,
    },
    systemPrompt: "",
    ...overrides,
  });
}

describe("AnthropicProvider — request body", () => {
  it("hits /v1/messages with the correct headers and body", async () => {
    let captured: { url: string; headers: Record<string, string>; body: string } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        captured = {
          url,
          headers: init.headers as Record<string, string>,
          body: init.body as string,
        };
        return new Response(sseStreamFrom(["data: [DONE]\n\n"]), { status: 200 });
      }),
    );

    const provider = new AnthropicProvider();
    for await (const _ of provider.stream({ messages: [] }, anthropicConfig())) {
      // drain
    }
    expect(captured).toBeDefined();
    expect(captured!.url).toBe("https://api.anthropic.com/v1/messages");
    expect(captured!.headers["x-api-key"]).toBe("test-key");
    expect(captured!.headers["anthropic-version"]).toBe("2023-06-01");

    const body = JSON.parse(captured!.body);
    expect(body.model).toBe("claude-3-5-haiku-latest");
    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(1024);
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("emits thinking block when thinking.enabled", async () => {
    let captured: { body: string } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        captured = { body: init.body as string };
        return new Response(sseStreamFrom(["data: [DONE]\n\n"]), { status: 200 });
      }),
    );
    const provider = new AnthropicProvider();
    for await (const _ of provider.stream(
      { messages: [] },
      anthropicConfig({ thinking: { enabled: true, budgetTokens: 2048 } }),
    )) {
      // drain
    }
    const body = JSON.parse(captured!.body);
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 2048 });
  });

  it("emits stop_sequences and tools when configured", async () => {
    let captured: { body: string } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        captured = { body: init.body as string };
        return new Response(sseStreamFrom(["data: [DONE]\n\n"]), { status: 200 });
      }),
    );
    const provider = new AnthropicProvider();
    for await (const _ of provider.stream(
      { messages: [] },
      anthropicConfig({
        stopSequences: ["STOP"],
        tools: [
          {
            name: "ping",
            description: "ping",
            parameters: { type: "object", properties: { x: { type: "number" } } },
          },
        ],
      }),
    )) {
      // drain
    }
    const body = JSON.parse(captured!.body);
    expect(body.stop_sequences).toEqual(["STOP"]);
    expect(body.tools).toEqual([
      {
        name: "ping",
        description: "ping",
        input_schema: { type: "object", properties: { x: { type: "number" } } },
      },
    ]);
  });
});

describe("AnthropicProvider — SSE event parser", () => {
  it("emits text deltas from content_block_delta events", async () => {
    const provider = new AnthropicProvider();
    const events = [
      'event: message_start\ndata: {"type":"message_start","message":{"model":"claude-3-5-haiku-latest"}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop"}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"input_tokens":10,"output_tokens":3}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ];
    const chunks: unknown[] = [];
    for await (const c of (
      provider as unknown as {
        parseStream: (b: ReadableStream<Uint8Array>, s: AbortSignal) => AsyncGenerator<unknown>;
      }
    ).parseStream(sseStreamFrom(events), new AbortController().signal)) {
      chunks.push(c);
    }
    const deltas = chunks
      .filter((c) => (c as { delta?: string }).delta)
      .map((c) => (c as { delta: string }).delta);
    expect(deltas).toEqual(["Hello ", "world"]);
    expect(chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ model: "claude-3-5-haiku-latest" }),
        expect.objectContaining({ finishReason: "stop" }),
      ]),
    );
  });

  it("strips thinking_delta content from visible text (encoded as a marker)", async () => {
    const provider = new AnthropicProvider();
    const events = [
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"scratchpad"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"answer"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ];
    const chunks: unknown[] = [];
    for await (const c of (
      provider as unknown as {
        parseStream: (b: ReadableStream<Uint8Array>, s: AbortSignal) => AsyncGenerator<unknown>;
      }
    ).parseStream(sseStreamFrom(events), new AbortController().signal)) {
      chunks.push(c);
    }
    const deltas = chunks
      .filter((c) => (c as { delta?: string }).delta)
      .map((c) => (c as { delta: string }).delta);
    // Thinking is emitted as a `\\u0000think:` marker; the engine strips it
    // before storing it on the message. The provider just yields the marker.
    expect(deltas).toHaveLength(2);
    expect(deltas[0]).toContain("think:");
    expect(deltas[1]).toBe("answer");
  });

  it("collects tool_use input_json_delta into a toolCall chunk", async () => {
    const provider = new AnthropicProvider();
    const events = [
      'event: content_block_start\ndata: {"type":"content_block_start","content_block":{"type":"tool_use","id":"toolu_1","name":"ping","input":{}}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{\\"x\\":"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"1}"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ];
    const chunks: unknown[] = [];
    for await (const c of (
      provider as unknown as {
        parseStream: (b: ReadableStream<Uint8Array>, s: AbortSignal) => AsyncGenerator<unknown>;
      }
    ).parseStream(sseStreamFrom(events), new AbortController().signal)) {
      chunks.push(c);
    }
    const toolChunks = chunks.filter((c) => (c as { toolCall?: unknown }).toolCall);
    expect(toolChunks).toHaveLength(3); // start + 2 deltas
    expect(toolChunks[0]).toEqual(
      expect.objectContaining({
        toolCall: expect.objectContaining({ id: "toolu_1", name: "ping" }),
      }),
    );
    expect(toolChunks[2]).toEqual(
      expect.objectContaining({
        toolCall: expect.objectContaining({ arguments: '{"x":1}' }),
      }),
    );
  });

  it("emits an error chunk on a typed error event", async () => {
    const provider = new AnthropicProvider();
    const events = [
      'event: error\ndata: {"type":"error","error":{"message":"bad"}}\n\n',
    ];
    const chunks: unknown[] = [];
    for await (const c of (
      provider as unknown as {
        parseStream: (b: ReadableStream<Uint8Array>, s: AbortSignal) => AsyncGenerator<unknown>;
      }
    ).parseStream(sseStreamFrom(events), new AbortController().signal)) {
      chunks.push(c);
    }
    expect(chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ error: expect.any(Object), finishReason: "error" }),
      ]),
    );
  });
});

describe("AnthropicProvider — retry / backoff", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries on 5xx then succeeds", async () => {
    let attempt = 0;
    const fetchMock = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) return new Response("boom", { status: 500 });
      return new Response(
        sseStreamFrom([
          'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
        ]),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new AnthropicProvider();
    const out: unknown[] = [];
    for await (const c of provider.stream(
      { messages: [] },
      anthropicConfig({ retry: { attempts: 3, initialDelayMs: 10, maxDelayMs: 100 } }),
    )) {
      out.push(c);
    }
    expect(attempt).toBe(2);
    expect(out).toEqual(expect.arrayContaining([expect.objectContaining({ finishReason: "stop" })]));
  });

  it("does NOT retry on 4xx auth errors", async () => {
    const fetchMock = vi.fn(async () => new Response("unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new AnthropicProvider();
    await expect(async () => {
      for await (const _ of provider.stream(
        { messages: [] },
        anthropicConfig({ retry: { attempts: 3, initialDelayMs: 10, maxDelayMs: 50 } }),
      )) {
        // drain
      }
    }).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("buildAnthropicUserContent", () => {
  it("emits an image block for image attachments", () => {
    const blocks = buildAnthropicUserContent({
      text: "look",
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
    expect(blocks[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "AAAA" },
    });
  });

  it("emits a document block for PDFs", () => {
    const blocks = buildAnthropicUserContent({
      text: "summarize",
      attachments: [
        {
          id: "a1",
          name: "paper.pdf",
          mimeType: "application/pdf",
          size: 1,
          dataUrl: "data:application/pdf;base64,QkJCRkRE",
        },
      ],
    });
    expect(blocks[0]).toEqual({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: "QkJCRkRE" },
    });
  });

  it("inlines text attachments", () => {
    const blocks = buildAnthropicUserContent({
      text: "see",
      attachments: [
        { id: "a1", name: "n.md", mimeType: "text/markdown", size: 4, text: "# hi" },
      ],
    });
    const txt = blocks.find((b) => (b as { type: string }).type === "text") as { text: string };
    expect(txt.text).toContain("# hi");
    expect(txt.text).toContain("```");
  });

  it("appends the user's text last", () => {
    const blocks = buildAnthropicUserContent({
      text: "user-text",
      attachments: [],
    });
    expect(blocks).toEqual([{ type: "text", text: "user-text" }]);
  });
});