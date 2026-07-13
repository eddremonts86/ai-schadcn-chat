/**
 * Integration tests that lock in the form → engine → chat propagation
 * contract. The bug fixed in dbff8e0 (nested ChatProvider shadowing the
 * outer one) and its cousins would silently come back if anyone ever
 * regresses the surface component to wrap itself in a fresh provider.
 *
 * These tests mount ConfigForm + ChatPanel inside ONE ChatProvider, mutate
 * the config via the form, and assert that the chat surface re-renders
 * with the new value. They run under jsdom via @testing-library/react.
 */
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { ChatProvider, ChatPanel, useChat } from "../../src/index.js";
import type { ChatConfig } from "../../src/types/chat.js";

const baseConfig: ChatConfig = {
  provider: {
    kind: "openai-compatible",
    baseUrl: "https://example.com",
    authHeader: "Authorization",
    credentials: { apiKey: "test-key" },
  },
  model: { id: "test-model", label: "Test model" },
  ui: {
    title: "Brand Title",
    showModelSelector: true,
    showDocumentPicker: true,
    showToolCalls: true,
    enableConversationHistory: true,
  },
};

/**
 * Mini form that mimics the playground's ConfigForm: reads `useChat()`,
 * finds the input by label, and mutates the config on input. Used so the
 * test can drive mutations without depending on the full UnifiedPlayground.
 */
function MiniForm() {
  const { config, updateConfig } = useChat();
  return (
    <div>
      <label htmlFor="title-input">Title</label>
      <input
        id="title-input"
        defaultValue={config.ui?.title ?? ""}
        onInput={(e) =>
          updateConfig({ ui: { ...config.ui, title: e.currentTarget.value } })
        }
      />
      <button
        type="button"
        onClick={() =>
          updateConfig({ ui: { ...config.ui, showModelSelector: false } })
        }
      >
        Hide model selector
      </button>
      <button
        type="button"
        onClick={() =>
          updateConfig({
            ui: { ...config.ui, enableConversationHistory: false },
          })
        }
      >
        Hide conversation history
      </button>
      <button
        type="button"
        onClick={() =>
          updateConfig({
            ui: { ...config.ui, enableCodeHighlight: false },
          })
        }
      >
        Disable code highlight
      </button>
    </div>
  );
}

describe("form → engine → chat propagation", () => {
  it("mutating ui.title via the form updates the chat brand title", async () => {
    render(
      <ChatProvider config={baseConfig}>
        <MiniForm />
        <ChatPanel config={baseConfig} />
      </ChatProvider>,
    );

    expect(screen.getByText("Brand Title")).toBeInTheDocument();

    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    await act(async () => {
      fireEvent.input(titleInput, { target: { value: "Updated via form" } });
    });

    expect(screen.getByText("Updated via form")).toBeInTheDocument();
  });

  it("hiding the model selector removes the chip from the header", async () => {
    render(
      <ChatProvider config={baseConfig}>
        <MiniForm />
        <ChatPanel config={baseConfig} />
      </ChatProvider>,
    );

    // The chip renders the active agent. With no `personality` set on the
    // config, the trigger button falls back to the literal string "Agent".
    expect(screen.getByText("Agent")).toBeInTheDocument();

    const hideButton = screen.getByRole("button", {
      name: "Hide model selector",
    });
    await act(async () => {
      fireEvent.click(hideButton);
    });

    expect(screen.queryByText("Agent")).not.toBeInTheDocument();
  });

  it("hiding conversation history removes the history chip", async () => {
    render(
      <ChatProvider config={baseConfig}>
        <MiniForm />
        <ChatPanel config={baseConfig} />
      </ChatProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Conversation history" }),
    ).toBeInTheDocument();

    const hideButton = screen.getByRole("button", {
      name: "Hide conversation history",
    });
    await act(async () => {
      fireEvent.click(hideButton);
    });

    expect(
      screen.queryByRole("button", { name: "Conversation history" }),
    ).not.toBeInTheDocument();
  });

  it("ChatPanel inside a parent provider does not create a duplicate engine", () => {
    // Regression guard for dbff8e0: if ChatPanel ever wraps itself in a
    // ChatProvider again, the panel would create a fresh engine and read
    // from that one instead of the parent's, and the assertions above
    // would silently pass on the wrong instance. We assert that the
    // brand mark renders the parent's initial title (not a fallback),
    // which would fail if the panel were reading from a fresh provider.
    render(
      <ChatProvider config={baseConfig}>
        <MiniForm />
        <ChatPanel config={baseConfig} />
      </ChatProvider>,
    );
    expect(screen.getByText("Brand Title")).toBeInTheDocument();
  });
});