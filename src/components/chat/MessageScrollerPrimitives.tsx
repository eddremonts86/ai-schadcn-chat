/**
 * Local MessageScroller primitives — API-compatible with the radix-rhea
 * wrapper that consumes `@shadcn/react/message-scroller`.
 *
 * The upstream `@shadcn/react` package is a workspace-only package in the
 * `shadcn-ui/ui` monorepo and is not published to npm. To keep this library
 * installable without forcing consumers to run the unpublished dep, we
 * inline a minimal subset of the primitives here:
 *
 *   - `Provider`         — owns the scroll state for the subtree
 *   - `Root`             — outer flex container
 *   - `Viewport`         — scrollable area (sticky-bottom auto-scroll)
 *   - `Content`          — flex column of items
 *   - `Item`             — registers each row + scroll-anchor slot
 *   - `Button`           — jump-to-start / jump-to-end button (visibility via `active`)
 *   - hooks: `useMessageScroller`, `useMessageScrollerScrollable`,
 *            `useMessageScrollerVisibility`
 *
 * This implementation intentionally covers only the behaviours the radix-rhea
 * styled components rely on (auto-scroll, jump-to-end, scroll-anchor on last
 * item, viewport visibility). Anything more advanced is left to consumers.
 */
"use client";

import * as React from "react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type MessageScrollerDefaultScrollPosition = "start" | "end";

export type MessageScrollerScrollAlign = "start" | "center" | "end";

export interface MessageScrollerScrollOptions {
  align?: MessageScrollerScrollAlign;
  behavior?: ScrollBehavior;
}

export interface MessageScrollerVisibilityState {
  /** True when the last registered item is in view at the bottom edge. */
  atEnd: boolean;
  /** True when the first registered item is in view at the top edge. */
  atStart: boolean;
}

export interface MessageScrollerProviderProps {
  autoScroll?: boolean;
  defaultScrollPosition?: MessageScrollerDefaultScrollPosition;
  scrollEdgeThreshold?: number;
  scrollPreviousItemPeek?: number;
  scrollMargin?: number;
  children?: React.ReactNode;
}

export interface MessageScrollerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode;
}

export interface MessageScrollerViewportProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode;
}

export interface MessageScrollerContentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode;
}

export interface MessageScrollerItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  id?: string;
  scrollAnchor?: boolean;
  children?: React.ReactNode;
}

export interface MessageScrollerButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  direction?: "start" | "end";
  render?: React.ReactElement;
  children?: React.ReactNode;
}

interface RegisteredMessage {
  id: string;
  element: HTMLElement | null;
  scrollAnchor?: boolean;
}

interface MessageScrollerState {
  viewportEl: HTMLElement | null;
  scrollHeight: number;
  scrollTop: number;
  viewportHeight: number;
  autoScroll: boolean;
}

type Listener = () => void;

class ScrollerStore {
  private state: MessageScrollerState = {
    viewportEl: null,
    scrollHeight: 0,
    scrollTop: 0,
    viewportHeight: 0,
    autoScroll: false,
  };
  private listeners = new Set<Listener>();

  getState = (): MessageScrollerState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setState = (partial: Partial<MessageScrollerState>): void => {
    this.state = { ...this.state, ...partial };
    for (const l of this.listeners) l();
  };
}

const VisibilityContext = React.createContext<{
  registerMessage: (msg: RegisteredMessage) => () => void;
  stateStore: ScrollerStore;
  scrollToIndex: (index: number, opts?: MessageScrollerScrollOptions) => void;
  scrollToEnd: (opts?: MessageScrollerScrollOptions) => void;
  scrollToStart: (opts?: MessageScrollerScrollOptions) => void;
  scrollToMessage: (id: string, opts?: MessageScrollerScrollOptions) => void;
} | null>(null);

function useScrollerContext() {
  const ctx = React.useContext(VisibilityContext);
  if (!ctx) {
    throw new Error(
      "MessageScroller primitives must be used within MessageScrollerProvider.",
    );
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function MessageScrollerProvider(props: MessageScrollerProviderProps) {
  const { autoScroll = false, defaultScrollPosition = "end", children } = props;

  const stateStoreRef = React.useRef<ScrollerStore | null>(null);
  if (stateStoreRef.current === null) stateStoreRef.current = new ScrollerStore();

  const messagesRef = React.useRef<RegisteredMessage[]>([]);
  const initialScrollDoneRef = React.useRef(false);

  const registerMessage = React.useCallback((msg: RegisteredMessage) => {
    messagesRef.current = [...messagesRef.current, msg];
    return () => {
      messagesRef.current = messagesRef.current.filter((m) => m.id !== msg.id);
    };
  }, []);

  const scrollToIndex = React.useCallback(
    (index: number, opts: MessageScrollerScrollOptions = {}) => {
      const vp = stateStoreRef.current!.getState().viewportEl;
      if (!vp) return;
      const item = messagesRef.current[index];
      if (!item?.element) return;
      const top = item.element.offsetTop;
      const align = opts.align ?? "start";
      let target = top;
      if (align === "end") target = top + item.element.offsetHeight - vp.clientHeight;
      else if (align === "center")
        target = top + item.element.offsetHeight / 2 - vp.clientHeight / 2;
      vp.scrollTo({ top: Math.max(0, target), behavior: opts.behavior ?? "smooth" });
    },
    [],
  );

  const scrollToEnd = React.useCallback(
    (opts?: MessageScrollerScrollOptions) =>
      scrollToIndex(messagesRef.current.length - 1, {
        align: "end",
        ...opts,
      }),
    [scrollToIndex],
  );

  const scrollToStart = React.useCallback(
    (opts?: MessageScrollerScrollOptions) =>
      scrollToIndex(0, { align: "start", ...opts }),
    [scrollToIndex],
  );

  const scrollToMessage = React.useCallback(
    (id: string, opts?: MessageScrollerScrollOptions) => {
      const idx = messagesRef.current.findIndex((m) => m.id === id);
      if (idx >= 0) scrollToIndex(idx, opts);
    },
    [scrollToIndex],
  );

  // Initial scroll to default position on mount + once the viewport is set.
  React.useEffect(() => {
    const store = stateStoreRef.current!;
    const unsubscribe = store.subscribe(() => {
      const s = store.getState();
      if (!s.viewportEl || initialScrollDoneRef.current) return;
      // Wait one frame for content to layout.
      requestAnimationFrame(() => {
        if (initialScrollDoneRef.current) return;
        if (defaultScrollPosition === "end") scrollToEnd({ behavior: "auto" });
        else scrollToStart({ behavior: "auto" });
        initialScrollDoneRef.current = true;
      });
    });
    return unsubscribe;
  }, [defaultScrollPosition, scrollToEnd, scrollToStart]);

  // Track autoScroll toggle in store so the Viewport effect can re-evaluate.
  React.useEffect(() => {
    stateStoreRef.current!.setState({ autoScroll });
  }, [autoScroll]);

  const ctxValue = React.useMemo(
    () => ({
      registerMessage,
      stateStore: stateStoreRef.current!,
      scrollToIndex,
      scrollToEnd,
      scrollToStart,
      scrollToMessage,
    }),
    [registerMessage, scrollToIndex, scrollToEnd, scrollToStart, scrollToMessage],
  );

  return (
    <VisibilityContext.Provider value={ctxValue}>
      {children}
    </VisibilityContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Public hooks                                                               */
/* -------------------------------------------------------------------------- */

export function useMessageScroller() {
  const { scrollToEnd, scrollToStart, scrollToMessage } = useScrollerContext();
  return React.useMemo(
    () => ({
      scrollToEnd,
      scrollToStart,
      scrollToMessage,
    }),
    [scrollToEnd, scrollToStart, scrollToMessage],
  );
}

export function useMessageScrollerScrollable(): MessageScrollerState {
  const { stateStore } = useScrollerContext();
  return React.useSyncExternalStore(
    stateStore.subscribe,
    stateStore.getState,
    stateStore.getState,
  );
}

export function useMessageScrollerVisibility(): MessageScrollerVisibilityState {
  const { stateStore } = useScrollerContext();
  // Cached snapshot — useSyncExternalStore requires stable refs between
  // calls when the underlying state hasn't changed.
  const cachedRef = React.useRef<MessageScrollerVisibilityState>({
    atEnd: false,
    atStart: true,
  });
  return React.useSyncExternalStore(
    stateStore.subscribe,
    () => {
      const s = stateStore.getState();
      const distance = s.scrollHeight - s.scrollTop - s.viewportHeight;
      const atEnd = distance < 32;
      const atStart = s.scrollTop < 32;
      const prev = cachedRef.current;
      if (prev.atEnd === atEnd && prev.atStart === atStart) return prev;
      const next = { atEnd, atStart };
      cachedRef.current = next;
      return next;
    },
    () => ({ atEnd: false, atStart: true }),
  );
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

const Root = React.forwardRef<HTMLDivElement, MessageScrollerProps>(function (
  { children, ...rest },
  ref,
) {
  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Viewport                                                                   */
/* -------------------------------------------------------------------------- */

const Viewport = React.forwardRef<HTMLDivElement, MessageScrollerViewportProps>(
  function ({ children, onScroll, ...rest }, ref) {
    const internalRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );
    const { stateStore } = useScrollerContext();

    // Register viewport in store.
    React.useEffect(() => {
      const node = internalRef.current;
      if (!node) return;
      stateStore.setState({
        viewportEl: node,
        scrollHeight: node.scrollHeight,
        scrollTop: node.scrollTop,
        viewportHeight: node.clientHeight,
      });
      return () => stateStore.setState({ viewportEl: null });
    }, [stateStore]);

    // Observe scroll + resize.
    React.useLayoutEffect(() => {
      const node = internalRef.current;
      if (!node) return;

      const update = () =>
        stateStore.setState({
          scrollHeight: node.scrollHeight,
          scrollTop: node.scrollTop,
          viewportHeight: node.clientHeight,
        });

      node.addEventListener("scroll", update, { passive: true });
      const ro = new ResizeObserver(update);
      ro.observe(node);

      // Also watch content mutations (new messages / size changes).
      const mo = new MutationObserver(update);
      mo.observe(node, { childList: true, subtree: true, characterData: true });

      // Initial measurement.
      update();

      return () => {
        node.removeEventListener("scroll", update);
        ro.disconnect();
        mo.disconnect();
      };
    }, [stateStore]);

    // Auto-scroll to bottom while user is at the edge and autoScroll is on.
    React.useEffect(() => {
      const unsubscribe = stateStore.subscribe(() => {
        const s = stateStore.getState();
        if (!s.viewportEl || !s.autoScroll) return;
        const distance = s.scrollHeight - s.scrollTop - s.viewportHeight;
        if (distance > 80) return;
        s.viewportEl.scrollTop = s.scrollHeight;
      });
      return unsubscribe;
    }, [stateStore]);

    return (
      <div
        ref={setRefs}
        onScroll={(e) => {
          onScroll?.(e);
        }}
        data-autoscrolling="false"
        {...rest}
      >
        {children}
      </div>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

const Content = React.forwardRef<HTMLDivElement, MessageScrollerContentProps>(
  function ({ children, ...rest }, ref) {
    return (
      <div ref={ref} {...rest}>
        {children}
      </div>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Item                                                                       */
/* -------------------------------------------------------------------------- */

const Item = React.forwardRef<HTMLDivElement, MessageScrollerItemProps>(
  function ({ id, scrollAnchor, children, ...rest }, ref) {
    const { registerMessage } = useScrollerContext();
    const internalRef = React.useRef<HTMLDivElement | null>(null);
    const generatedId = React.useId();
    const itemId = id ?? generatedId;
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    React.useEffect(() => {
      return registerMessage({
        id: itemId,
        element: internalRef.current,
        scrollAnchor,
      });
    }, [itemId, scrollAnchor, registerMessage]);

    return (
      <div ref={setRefs} {...rest}>
        {children}
      </div>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Button (jump-to-start / jump-to-end)                                       */
/* -------------------------------------------------------------------------- */

const Button = React.forwardRef<HTMLButtonElement, MessageScrollerButtonProps>(
  function (
    { direction = "end", render, onClick, children, ...rest },
    ref,
  ) {
    const { stateStore, scrollToEnd, scrollToStart } = useScrollerContext();
    const active = useMessageScrollerVisibility();
    const isEnd = direction === "end";
    const isActive = isEnd ? !active.atEnd : !active.atStart;
    // Touch stateStore to ensure re-render when scroll position changes.
    useMessageScrollerScrollable();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (isEnd) scrollToEnd();
      else scrollToStart();
    };

    if (render) {
      // Slot pattern — clone `render` and inject our props.
      return React.cloneElement(render as React.ReactElement<any>, {
        ref,
        onClick: handleClick,
        "data-active": isActive,
        "data-direction": direction,
        ...rest,
        children: children ?? (render as React.ReactElement<any>).props.children,
      });
    }

    return (
      <button
        ref={ref}
        type="button"
        data-active={isActive}
        data-direction={direction}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Public surface (mirror of `@shadcn/react/message-scroller`)                */
/* -------------------------------------------------------------------------- */

export const MessageScroller = {
  Provider: MessageScrollerProvider,
  Root,
  Viewport,
  Content,
  Item,
  Button,
};