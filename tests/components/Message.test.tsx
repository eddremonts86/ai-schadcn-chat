import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Message,
  MessageContent,
} from "../../src/components/chat/Message.js";

describe("Message component", () => {
  it("renders children for user role with align=end", () => {
    render(
      <Message align="end" data-role="user">
        <MessageContent>x</MessageContent>
      </Message>,
    );
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.getByText("x").closest('[data-slot="message"]')).toHaveAttribute("data-align", "end");
  });

  it("renders children for assistant role with align=start", () => {
    render(
      <Message align="start" data-role="assistant">
        <MessageContent>y</MessageContent>
      </Message>,
    );
    expect(screen.getByText("y").closest('[data-slot="message"]')).toHaveAttribute("data-align", "start");
  });

  it("renders children for tool role", () => {
    render(
      <Message data-role="tool">
        <MessageContent>z</MessageContent>
      </Message>,
    );
    expect(screen.getByText("z")).toBeInTheDocument();
    expect(screen.getByText("z").closest('[data-slot="message"]')).toBeInTheDocument();
  });

  it("exposes role via the data-role attribute for any consumer (e.g. Playwright selectors)", () => {
    render(
      <Message data-role="assistant">
        <MessageContent>hello</MessageContent>
      </Message>,
    );
    expect(screen.getByText("hello").closest('[data-role="assistant"]')).toBeInTheDocument();
  });
});