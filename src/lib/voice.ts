/**
 * useVoiceInput — small React hook around the Web Speech API
 * (`SpeechRecognition` / `webkitSpeechRecognition`) for voice-to-text
 * in the message composer.
 *
 * Why a separate module: `MessageInput` already imports a lot; isolating
 * the browser-only globals (window, navigator) behind a hook keeps the
 * composer's main render path clean. The hook returns plain booleans
 * and a small handler pair so the consumer doesn't need to know about
 * the underlying API.
 *
 * Browser support: `SpeechRecognition` ships in Chrome and Edge.
 * `webkitSpeechRecognition` is the prefixed variant Safari uses. Firefox
 * has none as of writing — `supported` will be `false` and the Mic
 * button should hide. The hook never throws on construction; it just
 * reports `supported: false` when the API is missing.
 *
 * SSR safety: every `window` / `navigator` access is inside a feature
 * check, so importing this module from a server component is safe.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>; resultIndex: number }) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionCtor = new () => RecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  }
}

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export interface UseVoiceInputResult {
  /** True if the host browser exposes a usable SpeechRecognition. */
  supported: boolean;
  /** True between `start()` and the next natural `end` (or `stop()`). */
  listening: boolean;
  /** The most recent error from permission denial or the recognition API. */
  error: string | null;
  /** Begin a recognition session. No-op when already listening or unsupported. */
  start: () => void;
  /** End the current session. No-op when not listening. */
  stop: () => void;
  /**
   * Most recent interim or final transcript. Subscribe via the parameter
   * callback for streaming results. Cleared when a new session starts.
   */
  transcript: string;
}

export interface UseVoiceInputOptions {
  /** Language hint for the recognizer, e.g. "es-ES" or "en-US". */
  lang?: string;
  /** Whether the recognizer should keep listening after each pause. */
  continuous?: boolean;
  /** Receives every interim and final transcript as it arrives. */
  onResult?: (transcript: string, isFinal: boolean) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputResult {
  const ctorRef = useRef<RecognitionCtor | null>(null);
  const instanceRef = useRef<RecognitionInstance | null>(null);
  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  // Resolve the constructor once on mount (client-only).
  useEffect(() => {
    const ctor = getCtor();
    ctorRef.current = ctor;
    setSupported(ctor !== null);
    return () => {
      instanceRef.current?.abort();
      instanceRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const ctor = ctorRef.current;
    if (!ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    if (instanceRef.current) return; // already running
    setError(null);
    setTranscript("");
    const inst = new ctor();
    inst.lang = options.lang ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
    inst.continuous = options.continuous ?? false;
    inst.interimResults = true;
    inst.onresult = (event) => {
      let buffer = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res && res[0]) buffer += res[0].transcript;
      }
      if (buffer) {
        setTranscript(buffer);
        const isFinal =
          event.results[event.results.length - 1]?.isFinal ?? false;
        options.onResult?.(buffer, isFinal);
      }
    };
    inst.onerror = (event) => {
      const message = event.error ?? event.message ?? "Voice recognition error";
      setError(message);
      setListening(false);
      instanceRef.current = null;
    };
    inst.onend = () => {
      setListening(false);
      instanceRef.current = null;
    };
    try {
      inst.start();
      instanceRef.current = inst;
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setListening(false);
      instanceRef.current = null;
    }
  }, [options.lang, options.continuous, options.onResult]);

  const stop = useCallback(() => {
    if (!instanceRef.current) return;
    try {
      instanceRef.current.stop();
    } catch {
      // Some browsers throw if stop() is called too soon. Swallow.
    }
  }, []);

  return { supported, listening, error, start, stop, transcript };
}