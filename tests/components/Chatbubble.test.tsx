import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Bubble, BubbleContent, BubbleGroup } from "../../src/components/chat/Chatbubble.js";

describe("Chatbubble component", () => {
  it("renders children inside the bubble content", () => {
    render(
      <BubbleGroup>
        <Bubble>
          <BubbleContent>hello world</BubbleContent>
        </Bubble>
      </BubbleGroup>,
    );
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("applies the default variant (data-variant=default)", () => {
    render(
      <Bubble>
        <BubbleContent>default</BubbleContent>
      </Bubble>,
    );
    const bubble = screen.getByText("default").closest('[data-slot="bubble"]');
    expect(bubble).toHaveAttribute("data-variant", "default");
  });

  it("applies an explicit variant", () => {
    render(
      <Bubble variant="muted">
        <BubbleContent>muted bubble</BubbleContent>
      </Bubble>,
    );
    const bubble = screen.getByText("muted bubble").closest('[data-slot="bubble"]');
    expect(bubble).toHaveAttribute("data-variant", "muted");
  });

  it("applies align=end", () => {
    render(
      <Bubble align="end">
        <BubbleContent>right-aligned</BubbleContent>
      </Bubble>,
    );
    const bubble = screen.getByText("right-aligned").closest('[data-slot="bubble"]');
    expect(bubble).toHaveAttribute("data-align", "end");
  });
});