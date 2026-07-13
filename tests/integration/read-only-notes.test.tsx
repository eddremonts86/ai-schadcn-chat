/**
 * Tests that the playground's read-only fields render self-explanatory
 * notes (lock icon, "Code-only" badge, path, code example with copy
 * button). These fields can't be edited via the form — the note is the
 * only signal telling the user WHY and HOW to configure them.
 *
 * Rather than exporting the internal ReadOnlyNote component, we mount
 * the whole playground with all sections open and assert that every
 * `[role="note"]` carries the four required signals. That is the
 * regression guard: if anyone ever reverts the ReadOnlyNote back to
 * a one-line plain-text box, these tests fail.
 */
import { describe, expect, it } from "vitest";
import { act, render, within } from "@testing-library/react";
import * as React from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { UnifiedPlayground } from "../../demo/src/components/UnifiedPlayground.js";

function mountPlayground() {
  return render(
    <TooltipProvider delayDuration={200}>
      <UnifiedPlayground />
    </TooltipProvider>,
  );
}

async function expandAllSections() {
  // Click every collapsed section trigger. Each click is a React state
  // update so we need an act() flush between them; otherwise the new
  // triggers won't be visible in the DOM yet.
  while (true) {
    const collapsed = document.querySelectorAll(
      'aside button[aria-expanded="false"]',
    );
    if (collapsed.length === 0) break;
    for (const btn of Array.from(collapsed)) {
      await act(async () => {
        (btn as HTMLButtonElement).click();
      });
    }
  }
}

describe("ReadOnlyNote — self-explanatory read-only fields", () => {
  it("renders at least the documented set of read-only fields", async () => {
    mountPlayground();
    await expandAllSections();

    // The catalog advertises exactly 9 read-only paths:
    //   documents, thinking, onResponse, onError, tools,
    //   ui.emptyState, ui.renderMessage, ui.renderHeader, ui.renderFooter
    // We find them via the Lock icon (a stable class) instead of the
    // "note" role, because Radix's scroll-lock sets `pointer-events: none`
    // on <body> during the test render and that hides the role from
    // testing-library's default role lookup.
    const notes = Array.from(document.querySelectorAll(".lucide-lock"))
      .map((lock) => lock.closest('[role="note"]'))
      .filter((n): n is HTMLElement => n !== null);
    expect(notes.length).toBeGreaterThanOrEqual(9);
  });

  it("every read-only note carries a Lock icon, 'Code-only' badge, and a Copy button", async () => {
    mountPlayground();
    await expandAllSections();

    const notes = Array.from(document.querySelectorAll(".lucide-lock"))
      .map((lock) => lock.closest('[role="note"]'))
      .filter((n): n is HTMLElement => n !== null);
    expect(notes.length).toBeGreaterThan(0);

    for (const note of notes) {
      const within_note = within(note);
      expect(within_note.getByText("Code-only")).toBeTruthy();
      // Every documented read-only note provides a code example;
      // the Copy button is therefore always present.
      expect(
        note.querySelector('button[aria-label="Copy code example"]'),
      ).toBeTruthy();
    }
  });

  it("aria-label on each note names the field plus the reason", async () => {
    mountPlayground();
    await expandAllSections();

    const notes = Array.from(document.querySelectorAll(".lucide-lock"))
      .map((lock) => lock.closest('[role="note"]'))
      .filter((n): n is HTMLElement => n !== null);
    for (const note of notes) {
      const aria = note.getAttribute("aria-label") ?? "";
      expect(aria).toMatch(/is read-only:/);
      // No leftover plain-text boileplate like "Closures cannot be
      // set from a form" without context.
      expect(aria.length).toBeGreaterThan(20);
    }
  });
});