import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";

const sendMock = vi.fn().mockResolvedValue(undefined);
const abortMock = vi.fn();

vi.mock("../../src/hooks/useChat.js", () => ({
  useChat: () => ({
    send: sendMock,
    abort: abortMock,
    isStreaming: false,
    config: {
      provider: { kind: "openai-compatible", baseUrl: "https://example.com", credentials: { apiKey: "test" } },
      model: { id: "test-model", label: "Test" },
    },
    messages: [],
  }),
}));

// Import AFTER vi.mock so the mocked module is in scope.
import { MessageInput } from "../../src/components/chat/MessageInput.js";

function renderInput(props: Partial<React.ComponentProps<typeof MessageInput>> = {}) {
  return render(
    <TooltipProvider delayDuration={0}>
      <MessageInput {...props} />
    </TooltipProvider>,
  );
}

describe("MessageInput component", () => {
  it("renders a textarea and a send button", () => {
    renderInput();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("calls useChat().send with typed text and an empty attachments array when Enter is pressed", async () => {
    sendMock.mockClear();
    renderInput();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "PONG" } });
    fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    expect(sendMock).toHaveBeenCalledWith("PONG", []);
  });

  it("does NOT submit on Shift+Enter (newline allowed)", async () => {
    sendMock.mockClear();
    renderInput();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "draft" } });
    fireEvent.keyDown(textarea, { key: "Enter", code: "Enter", shiftKey: true });
    // No send call expected.
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("uses the onSend override when supplied", async () => {
    sendMock.mockClear();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend });
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "via override" } });
    fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(onSend).toHaveBeenCalledWith("via override", []);
    expect(sendMock).not.toHaveBeenCalled();
  });
});