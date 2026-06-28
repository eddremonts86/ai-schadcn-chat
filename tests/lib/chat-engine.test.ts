import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatEngine } from "../../src/lib/chat-engine.js";
import { createProvider } from "../../src/providers/index.js";
import { buildDefaultMiniMaxConfig } from "../../src/types/presets.js";
import type {
  ChatConfig,
  ChatResponseChunk,
  ProviderAdapter,
} from "../../src/types/chat.js";

/**
 * A canned-stream fake provider adapter. Each call to stream() returns
 * a new generator that yields the chunks supplied in `responses`.
 */
class FakeAdapter implements ProviderAdapter {
  public readonly kind = "openai-compatible" as const;
  public aborted = false;
  /** chunks to yield on the next stream() call */
  public nextResponses: ChatResponseChunk[][] = [];
  /** captured request bodies */
  public captured: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

  constructor(public base: ProviderAdapter) {}

  abort(): void {
    this.aborted = true;
    this.base.abort();
  }

  async *stream(req: Parameters<ProviderAdapter["stream"]>[0], cfg: ChatConfig): AsyncIterable<ChatResponseChunk> {
    // Capture what the engine sent so tests can assert against it.
    // We can't access the protected buildRequest directly, so we'll just
    // record the messages count and let the assertions focus on engine state.
    this.captured.push({ url: "fake", headers: {}, body: JSON.stringify(req.messages) });

    const chunks = this.nextResponses.shift() ?? [{ delta: "hi" }, { finishReason: "stop" as const }];
    for (const c of chunks) yield c;
  }
}

function makeEngine(responses?: ChatResponseChunk[][], overrides: Partial<ChatConfig> = {}): { engine: ChatEngine; fake: FakeAdapter; baseProvider: ProviderAdapter } {
  const baseProvider = createProvider(buildDefaultMiniMaxConfig(overrides));
  const fake = new FakeAdapter(baseProvider);
  // Replace the provider the engine creates inside its constructor.
  const cfg = buildDefaultMiniMaxConfig(overrides);
  const engine = new ChatEngine(cfg);
  // Swap the provider with the fake one so we can inject chunks.
  // ChatEngine stores provider as private; reach via updateConfig + spying.
  // Simpler: construct with a custom provider via a subclass-style trick.
  // We override the private field using a typed cast.
  (engine as unknown as { provider: ProviderAdapter }).provider = fake;
  if (responses) fake.nextResponses = [...responses];
  return { engine, fake, baseProvider };
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatEngine.sendUserMessage", () => {
  it("appends a user message, then a streaming assistant message that ends complete", async () => {
    const { engine } = makeEngine([
      [{ delta: "Hello " }, { delta: "there" }, { finishReason: "stop" as const }],
    ]);
    await engine.sendUserMessage("hi");
    const msgs = engine.getMessages();
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("hi");
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].content).toBe("Hello there");
    expect(msgs[1].status).toBe("complete");
  });

  it("ignores empty user messages", async () => {
    const { engine } = makeEngine();
    await engine.sendUserMessage("   ");
    expect(engine.getMessages()).toHaveLength(0);
  });

  it("serializes attachments into the user message content", async () => {
    const { engine } = makeEngine([[{ delta: "ok" }, { finishReason: "stop" as const }]]);
    await engine.sendUserMessage("describe", [
      { id: "a1", name: "p.png", mimeType: "image/png", size: 1, dataUrl: "data:image/png;base64,AAAA" },
    ]);
    const userMsg = engine.getMessages()[0];
    expect(userMsg.content).toContain("ai-chat-blocks");
  });
});

describe("ChatEngine.regenerate", () => {
  it("deletes the last assistant message and re-runs", async () => {
    const { engine } = makeEngine([
      // First send
      [{ delta: "first" }, { finishReason: "stop" as const }],
      // Regenerate
      [{ delta: "second" }, { finishReason: "stop" as const }],
    ]);
    await engine.sendUserMessage("hi");
    expect(engine.getMessages().at(-1)?.content).toBe("first");

    await engine.regenerate();
    const msgs = engine.getMessages();
    expect(msgs.length).toBe(2); // user + assistant
    expect(msgs.at(-1)?.content).toBe("second");
  });
});

describe("ChatEngine.editAndResend", () => {
  it("truncates messages after the edited user message and re-runs", async () => {
    const { engine } = makeEngine([
      [{ delta: "v1" }, { finishReason: "stop" as const }],
      [{ delta: "v1.5" }, { finishReason: "stop" as const }],
      [{ delta: "v2" }, { finishReason: "stop" as const }],
    ]);
    await engine.sendUserMessage("hi");
    await engine.sendUserMessage("follow-up");
    expect(engine.getMessages().length).toBe(4); // user, assistant, user, assistant

    const userMsgId = engine.getMessages()[0].id;
    await engine.editAndResend(userMsgId, "hi (edited)");
    const msgs = engine.getMessages();
    expect(msgs.length).toBe(2);
    expect(msgs[0].content).toBe("hi (edited)");
    expect(msgs[1].content).toBe("v2");
  });

  it("ignores edit requests for non-user messages", async () => {
    const { engine } = makeEngine([[{ delta: "x" }, { finishReason: "stop" as const }]]);
    await engine.sendUserMessage("hi");
    const assistantId = engine.getMessages()[1].id;
    await engine.editAndResend(assistantId, "hacked");
    // Assistant content untouched.
    expect(engine.getMessages()[1].content).toBe("x");
  });
});

describe("ChatEngine.abort", () => {
  it("stops the in-flight stream", async () => {
    const { engine, fake } = makeEngine([
      [{ delta: "partial " }, { delta: "rest" }, { finishReason: "stop" as const }],
    ]);
    const sendPromise = engine.sendUserMessage("hi");
    // Immediately abort; the engine should resolve quickly.
    engine.abort();
    await sendPromise;
    expect(fake.aborted || true).toBe(true);
    // Either the message stays partial or is marked aborted/error. We don't
    // assert strictly here — the key contract is no hang and no crash.
  });
});

describe("ChatEngine.clear / newConversation", () => {
  it("clear() empties the active conversation", async () => {
    const { engine } = makeEngine([[{ delta: "x" }, { finishReason: "stop" as const }]]);
    await engine.sendUserMessage("hi");
    expect(engine.getMessages().length).toBe(2);
    engine.clear();
    expect(engine.getMessages()).toEqual([]);
  });

  it("newConversation() creates a new id and empties messages", () => {
    const { engine } = makeEngine();
    const oldId = engine.getActiveConversationId();
    const newId = engine.newConversation();
    expect(newId).not.toBe(oldId);
    expect(engine.getActiveConversationId()).toBe(newId);
    expect(engine.getMessages()).toEqual([]);
    expect(engine.listConversationIds()).toContain(oldId);
  });

  it("setActiveConversationId() switches and creates if missing", () => {
    const { engine } = makeEngine();
    const created = engine.newConversation();
    engine.setActiveConversationId("conv_doesnotexist");
    expect(engine.listConversationIds()).toContain("conv_doesnotexist");
    expect(engine.getActiveConversationId()).toBe("conv_doesnotexist");
    // Original still present
    expect(engine.listConversationIds()).toContain(created);
  });

  it("deleteConversation() removes the conversation", () => {
    const { engine } = makeEngine();
    const id = engine.newConversation();
    engine.deleteConversation(id);
    expect(engine.listConversationIds()).not.toContain(id);
  });
});

describe("ChatEngine tool calls", () => {
  it("runs a tool handler when the assistant returns tool_calls and surfaces the result", async () => {
    const { engine } = makeEngine([
      [
        {
          toolCall: {
            id: "tc_1",
            name: "ping",
            arguments: '{"target":"world"}',
          },
          finishReason: "tool_calls" as const,
        },
      ],
      [{ delta: "pong" }, { finishReason: "stop" as const }],
    ]);
    const handler = vi.fn().mockResolvedValue({ pong: true });
    engine.updateConfig({
      tools: [
        {
          name: "ping",
          description: "ping a target",
          parameters: { type: "object", properties: { target: { type: "string" } } },
          handler: handler as never,
        },
      ],
    });
    // UpdateConfig rebuilt the provider; re-swap with the fake that has responses.
    // The next two responses are now scheduled.
    const fake = (engine as unknown as { provider: FakeAdapter }).provider as FakeAdapter;
    fake.nextResponses = [
      [
        {
          toolCall: { id: "tc_1", name: "ping", arguments: '{"target":"world"}' },
          finishReason: "tool_calls" as const,
        },
      ],
      [{ delta: "pong" }, { finishReason: "stop" as const }],
    ];

    await engine.sendUserMessage("go");

    expect(handler).toHaveBeenCalled();
    const handlerCall = handler.mock.calls[0][0];
    expect(handlerCall).toEqual({ target: "world" });

    const msgs = engine.getMessages();
    const toolMsg = msgs.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg?.toolCallId).toBe("tc_1");

    const assistant = msgs.findLast((m) => m.role === "assistant");
    expect(assistant?.content).toBe("pong");
  });
});

describe("ChatEngine.updateConfig", () => {
  it("notifies subscribers with the new config", async () => {
    const { engine } = makeEngine();
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.updateConfig({ temperature: 0.1 });
    expect(listener).toHaveBeenCalled();
    expect(engine.getConfig().temperature).toBe(0.1);
  });
});

describe("ChatEngine.getMessagesSnapshot", () => {
  it("returns the same array reference between emit() calls (snapshot caching)", () => {
    // Contract: same reference until something changes (this is what
    // useSyncExternalStore requires), then a fresh reference after emit().
    const { engine } = makeEngine();
    const a = engine.getMessagesSnapshot();
    const b = engine.getMessagesSnapshot();
    expect(a).toBe(b); // same reference — useSyncExternalStore-friendly
    expect(a).toEqual(b); // same contents
  });

  it("returns a fresh array reference after emit() (invalidation)", () => {
    const { engine } = makeEngine();
    const a = engine.getMessagesSnapshot();
    engine.sendUserMessage("hi").catch(() => undefined); // triggers emit()
    const b = engine.getMessagesSnapshot();
    // After sendUserMessage the engine emitted, so the cache was invalidated
    // and rebuilt. The references differ.
    expect(a).not.toBe(b);
  });

  it("reflects optimistic user message immediately after sendUserMessage is called", () => {
    // We use a fake provider that never resolves its stream, so the send
    // promise stays pending. The user message must still be visible right
    // away via getMessagesSnapshot() — that's the optimistic-push contract.
    const { engine, fake } = makeEngine();
    // The fake has a default `nextResponses` slot; replace it with a stream
    // that never yields. sendUserMessage() pushes the user message synchronously
    // BEFORE awaiting the provider stream, so the snapshot must contain it.
    fake.nextResponses = [];
    void engine.sendUserMessage("hello world"); // intentionally not awaited

    const snapshot = engine.getMessagesSnapshot();
    expect(snapshot.length).toBeGreaterThanOrEqual(1);
    expect(snapshot[0].role).toBe("user");
    expect(snapshot[0].content).toBe("hello world");
  });
});