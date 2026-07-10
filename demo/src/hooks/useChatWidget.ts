import { useCallback, useState } from "react";

export interface ChatWidgetControls {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/** Local open/close state for the floating support-style chat widget. */
export function useChatWidget(initialOpen = false): ChatWidgetControls {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, open, close, toggle };
}
