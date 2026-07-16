import type { ChatConfig, ProviderAdapter, ProviderKind } from "../types/chat.js";
import { AnthropicProvider } from "./anthropic.js";
import { ChromeAIProvider } from "./chrome.js";
import { OpenAIProvider } from "./openai.js";

/**
 * Build a streaming provider adapter for the given ChatConfig.
 *
 * The provider kind is taken from `cfg.provider.kind`. Override with
 * `cfg.model.provider` when a specific model lives on a different
 * provider than the chat's default.
 */
export function createProvider(cfg: ChatConfig): ProviderAdapter {
  const kind = cfg.model.provider ?? cfg.provider.kind;
  switch (kind) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider("openai");
    case "openai-compatible":
      return new OpenAIProvider("openai-compatible");
    case "chrome-builtin":
      return new ChromeAIProvider();
    default:
      throw new Error(`Unsupported provider kind: ${kind satisfies never as ProviderKind}`);
  }
}

export { AnthropicProvider, OpenAIProvider, ChromeAIProvider };
export { chromeAiAvailability } from "./chrome.js";
export type { ChromeAvailability } from "./chrome.js";
export type { ProviderAdapter };
export * from "./base.js";