/**
 * Vitest setup. Loaded before every test file.
 *
 * - wires @testing-library/jest-dom matchers into Vitest's expect
 * - stubs jsdom-missing browser APIs that React UI code touches
 *   (matchMedia, IntersectionObserver, ResizeObserver, clipboard)
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't ship matchMedia.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // legacy Safari
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// jsdom doesn't ship observers.
if (typeof globalThis !== "undefined") {
  if (!("IntersectionObserver" in globalThis)) {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    // @ts-expect-error - assigning to globalThis for jsdom
    globalThis.IntersectionObserver = MockIntersectionObserver;
  }
  if (!("ResizeObserver" in globalThis)) {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error - assigning to globalThis for jsdom
    globalThis.ResizeObserver = MockResizeObserver;
  }
  if (!("scrollTo" in globalThis) && typeof window !== "undefined") {
    // jsdom Element#scrollTo polyfill.
    if (!Element.prototype.scrollTo) {
      Element.prototype.scrollTo = function scrollTo() {};
    }
  }
}

// navigator.clipboard is not implemented in jsdom by default.
if (
  typeof navigator !== "undefined" &&
  navigator.clipboard &&
  typeof navigator.clipboard.writeText !== "function"
) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
    configurable: true,
  });
}

// React 19 + jsdom: act() warnings are noisy without this in some setups.
if (typeof IS_REACT_ACT_ENVIRONMENT === "undefined") {
  // @ts-expect-error - setting global for React's act environment detection
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});