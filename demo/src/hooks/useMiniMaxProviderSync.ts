import { useEffect } from "react";
import {
  deleteProvider,
  listProviders,
  saveProvider,
  seedProviders,
  setActiveProviderId,
} from "ai-schadcn-chat";

/**
 * Keeps the package's built-in provider manager in sync with the
 * env-configured MiniMax credentials, so the model switcher / manager UI
 * matches the live config out of the box, and collapses any duplicate LM
 * Studio entries left over from earlier sessions into one canonical entry
 * pointing at the Vite proxy path (`/lmstudio/v1`) so the browser stays
 * same-origin and avoids CORS. Both effects are idempotent.
 */
export function useMiniMaxProviderSync(apiKey: string, baseUrl?: string): void {
  useEffect(() => {
    if (!apiKey) {
      // No hosted key (public demo): make Chrome's on-device model the active
      // provider so the manager UI matches the key-less fallback config.
      setActiveProviderId("seed:chrome");
      return;
    }
    const minimax = listProviders().find((p) => p.id === "seed:minimax");
    if (minimax && !minimax.apiKey) {
      saveProvider({
        ...minimax,
        apiKey,
        baseUrl: baseUrl ?? minimax.baseUrl,
      });
      setActiveProviderId("seed:minimax");
    }
  }, [apiKey, baseUrl]);

  useEffect(() => {
    const PROXIED_LMSTUDIO_URL = "/lmstudio/v1";
    const base = seedProviders().find((p) => p.id === "seed:lmstudio");
    if (!base) return;
    const duplicates = listProviders().filter((p) => p.name === base.name);
    const isAlreadyCanonical =
      duplicates.length === 1 &&
      duplicates[0].id === "seed:lmstudio" &&
      duplicates[0].baseUrl === PROXIED_LMSTUDIO_URL;
    if (isAlreadyCanonical) return;
    duplicates.forEach((p) => deleteProvider(p.id));
    saveProvider({ ...base, id: "seed:lmstudio", baseUrl: PROXIED_LMSTUDIO_URL });
  }, []);
}
