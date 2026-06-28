import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "../../src/components/chat/Attachment.js";
import type { AttachmentMeta } from "../../src/types/chat.js";

const baseMeta: AttachmentMeta = {
  id: "att-1",
  name: "photo.png",
  mimeType: "image/png",
  size: 1024 * 12,
};

describe("Attachment component", () => {
  it("renders the title and description from the meta prop", () => {
    render(
      <Attachment data-state="done" data-size="default">
        <AttachmentMedia>
          <img src="data:image/png;base64,AAAA" alt="photo.png" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>photo.png</AttachmentTitle>
          <AttachmentDescription>image/png · 12 KB</AttachmentDescription>
        </AttachmentContent>
      </Attachment>,
    );

    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText(/image\/png · 12 KB/)).toBeInTheDocument();
    expect(screen.getByAltText("photo.png")).toBeInTheDocument();
  });

  it("renders the actions slot", () => {
    render(
      <Attachment data-state="done">
        <AttachmentContent>
          <AttachmentTitle>doc.pdf</AttachmentTitle>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Remove">X</AttachmentAction>
        </AttachmentActions>
      </Attachment>,
    );

    const remove = screen.getByRole("button", { name: "Remove" });
    expect(remove).toBeInTheDocument();
    expect(remove).toHaveAttribute("data-slot", "attachment-action");
  });

  it("applies variant-specific data attributes (image vs icon media)", () => {
    const { rerender } = render(
      <Attachment data-state="done">
        <AttachmentMedia variant="icon">
          <span>📎</span>
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>file.txt</AttachmentTitle>
        </AttachmentContent>
      </Attachment>,
    );
    expect(screen.getByText("📎").parentElement).toHaveAttribute("data-variant", "icon");

    rerender(
      <Attachment data-state="done">
        <AttachmentMedia variant="image">
          <img src="data:image/png;base64,AAAA" alt="x" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>file.txt</AttachmentTitle>
        </AttachmentContent>
      </Attachment>,
    );
    expect(screen.getByAltText("x").parentElement).toHaveAttribute("data-variant", "image");
  });

  it("forwards arbitrary HTML props to the root div", () => {
    render(
      <Attachment data-state="done" data-testid="att">
        <AttachmentContent>
          <AttachmentTitle>{baseMeta.name}</AttachmentTitle>
        </AttachmentContent>
      </Attachment>,
    );
    expect(screen.getByTestId("att")).toHaveAttribute("data-slot", "attachment");
  });
});