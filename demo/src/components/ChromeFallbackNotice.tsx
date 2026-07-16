import { useEffect, useState, type ReactElement } from "react";
import { chromeAiAvailability, type ChromeAvailability } from "ai-schadcn-chat";

/**
 * Shown only in the key-less public demo. Chrome's on-device model works just
 * in Chrome 138+ on supported hardware, so when it can't run we surface a
 * banner explaining how to enable it or to bring your own key via the chat's
 * provider manager. When it's available (or still downloading) nothing shows.
 */
export function ChromeFallbackNotice(): ReactElement | null {
  const [status, setStatus] = useState<ChromeAvailability | null>(null);

  useEffect(() => {
    let active = true;
    void chromeAiAvailability().then((s) => {
      if (active) setStatus(s);
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === null || status !== "unavailable") return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-200">
      This demo runs on Chrome's built-in AI (no API key needed), which requires{" "}
      <strong>Chrome 138+</strong> on supported hardware with the Prompt API enabled at{" "}
      <code className="rounded bg-black/20 px-1 py-0.5 font-mono text-xs">
        chrome://flags/#prompt-api-for-gemini-nano
      </code>
      . Otherwise, open the chat's model menu to connect your own provider key.
    </div>
  );
}
