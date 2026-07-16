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

// Node 22+ ships an experimental global `localStorage` that is unusable
// without --localstorage-file, and under it jsdom's window.localStorage comes
// through as undefined — so any browser code that persists state (conversation
// history, provider profiles) throws in tests. Provide a real in-memory
// Storage so those paths work regardless of the Node version running the suite.
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  const memoryStorage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  } as unknown as Storage;
  Object.defineProperty(window, "localStorage", {
    value: memoryStorage,
    configurable: true,
  });
}

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
  // jsdom doesn't ship scrollIntoView. Radix's anchor-positioning code
  // calls it during measurement; without the shim, mounting any
  // popover/dropdown in a test throws "candidate?.scrollIntoView is
  // not a function".
  if (
    typeof Element !== "undefined" &&
    !("scrollIntoView" in Element.prototype)
  ) {
    Element.prototype.scrollIntoView = function scrollIntoView() {
      /* no-op in jsdom */
    };
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