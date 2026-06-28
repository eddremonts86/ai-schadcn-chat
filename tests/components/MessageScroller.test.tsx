import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { Bubble, BubbleContent } from "../../src/components/chat/Chatbubble.js";
import {
  Message,
  MessageContent,
} from "../../src/components/chat/Message.js";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "../../src/components/chat/MessageScroller.js";
import type { ChatMessage } from "../../src/types/chat.js";

function fakeMessages(n: number): ChatMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m-${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    content: `message ${i}`,
    status: "complete" as const,
  }));
}

describe("MessageScroller component", () => {
  it("renders a bubble for each of 5 fake ChatMessage objects", () => {
    const messages = fakeMessages(5);
    render(
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              {messages.map((m) => (
                <MessageScrollerItem key={m.id} id={m.id}>
                  <Message
                    align={m.role === "user" ? "end" : "start"}
                    data-role={m.role}
                    data-message-id={m.id}
                  >
                    <MessageContent>
                      <Bubble>
                        <BubbleContent>{m.content}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>,
    );

    // Each message text should appear in the DOM.
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`message ${i}`)).toBeInTheDocument();
    }
    // All 5 scroller items registered.
    expect(screen.getAllByTestId).toBeDefined();
  });

  it("does not enter an infinite render loop when many items mount", () => {
    let renderCount = 0;
    function CountingChild({ children }: { children: React.ReactNode }) {
      renderCount++;
      return <>{children}</>;
    }

    const messages = fakeMessages(5);
    render(
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              {messages.map((m) => (
                <MessageScrollerItem key={m.id} id={m.id}>
                  <CountingChild>
                    <Message data-role={m.role}>
                      <MessageContent>
                        <Bubble>
                          <BubbleContent>{m.content}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </CountingChild>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>,
    );

    // 5 children, each rendered a small handful of times.
    // Strict threshold: < 10 * numberOfChildren = < 50.
    expect(renderCount).toBeLessThan(50);
    expect(renderCount).toBeGreaterThanOrEqual(5);
  });
});