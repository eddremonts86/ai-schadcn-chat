import { useCallback } from "react";

/** Smooth-scrolls the viewport to an element by id (nav links, CTAs, …). */
export function useScrollToId(): (id: string) => void {
  return useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
}
