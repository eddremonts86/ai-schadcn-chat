import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type {
  AttachmentMeta,
  ChatConfig,
  ChatMessage,
  ConversationMeta,
} from "../../types/chat.js";
import { ChatEngine as ChatEngineImpl } from "../../lib/chat-engine.js";
import { buildDefaultMiniMaxConfig } from "../../types/presets.js";

export interface ChatContextValue {
  engine: ChatEngineImpl;
  config: ChatConfig;
  /**
   * Update the active config. Two overloads:
   *   - `updateConfig(partial)` — shallow-merge partial into the current config.
   *   - `updateConfig(updater)` — functional form, receives the current
   *     config and returns the partial to merge. Use this when the partial
   *     needs to read the current config (avoids stale-closure bugs in
   *     long-lived form components).
   */
  updateConfig(partial: Partial<ChatConfig>): void;
  updateConfig(
    updater: (current: ChatConfig) => Partial<ChatConfig>,
  ): void;
  messages: ChatMessage[];
  isStreaming: boolean;
  conversationId: string;
  setConversationId: (id: string) => void;
  send: (text: string, attachments?: AttachmentMeta[]) => Promise<void>;
  sendFiles: (text: string, files: File[]) => Promise<void>;
  abort: () => void;
  regenerate: () => Promise<void>;
  editAndResend: (messageId: string, newContent: string) => Promise<void>;
  clear: () => void;
  newConversation: () => string;
  deleteMessage: (messageId: string) => void;
  deleteConversation: (id: string) => void;
  listConversations: () => string[];
  listConversationsMeta: () => ConversationMeta[];
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  config: ChatConfig;
  children: ReactNode;
}

/**
 * Mount a chat engine for the lifetime of the React subtree. Multiple
 * ChatProviders can coexist; each gets its own engine. The provider
 * uses useSyncExternalStore for concurrent-mode-safe subscriptions.
 */
export function ChatProvider(props: ChatProviderProps): ReactNode {
  const engineRef = useRef<ChatEngineImpl | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new ChatEngineImpl(props.config);
  }

  // Whenever the `config` prop changes, sync it into the engine.
  // We compare by JSON to avoid spurious updates that would still
  // trigger a re-render through the subscription.
  const configRef = useRef<ChatConfig>(props.config);
  if (!shallowEqual(configRef.current, props.config)) {
    configRef.current = props.config;
    engineRef.current.updateConfig(props.config);
  }

  // useSyncExternalStore requires the subscribe callback to be stable
  // across renders — otherwise React tears down + recreates the
  // subscription on every render and emits are lost. Memoize once
  // against the engineRef, which itself is stable for the provider's
  // lifetime.
  const subscribe = useCallback(
    (cb: () => void) => engineRef.current!.subscribe(cb),
    [],
  );
  const getMessages = useCallback(
    () => engineRef.current!.getMessagesSnapshot(),
    [],
  );
  const getConfigSnapshot = useCallback(
    () => engineRef.current!.getConfig(),
    [],
  );
  const getActiveConversationId = useCallback(
    () => engineRef.current!.getActiveConversationId(),
    [],
  );
  const getIsStreaming = useCallback(
    () =>
      engineRef.current!
        .getMessagesSnapshot()
        .some((m: ChatMessage) => m.status === "streaming"),
    [],
  );

  const messages = useSyncExternalStore(subscribe, getMessages, getMessages);
  const config = useSyncExternalStore(
    subscribe,
    getConfigSnapshot,
    getConfigSnapshot,
  );
  const conversationId = useSyncExternalStore(
    subscribe,
    getActiveConversationId,
    getActiveConversationId,
  );
  const isStreaming = useSyncExternalStore(
    subscribe,
    getIsStreaming,
    getIsStreaming,
  );

  const updateConfig = useCallback(
    (
      arg:
        | Partial<ChatConfig>
        | ((current: ChatConfig) => Partial<ChatConfig>),
    ) => {
      engineRef.current!.updateConfig(arg as never);
    },
    [],
  );

  const setConversationId = useCallback((id: string) => {
    engineRef.current!.setActiveConversationId(id);
  }, []);

  const send = useCallback(async (text: string, attachments?: AttachmentMeta[]) => {
    await engineRef.current!.sendUserMessage(text, attachments);
  }, []);

  const sendFiles = useCallback(async (text: string, files: File[]) => {
    await engineRef.current!.sendFiles(text, files);
  }, []);

  const abort = useCallback(() => engineRef.current!.abort(), []);
  const regenerate = useCallback(() => engineRef.current!.regenerate(), []);
  const editAndResend = useCallback(
    (id: string, content: string) => engineRef.current!.editAndResend(id, content),
    [],
  );
  const clear = useCallback(() => engineRef.current!.clear(), []);
  const newConversation = useCallback(() => engineRef.current!.newConversation(), []);
  const deleteMessage = useCallback((messageId: string) => {
    engineRef.current!.deleteMessage(messageId);
  }, []);
  const deleteConversation = useCallback((id: string) => {
    engineRef.current!.deleteConversation(id);
  }, []);
  const listConversations = useCallback(() => engineRef.current!.listConversationIds(), []);
  const listConversationsMeta = useCallback(
    () => engineRef.current!.listConversationsMeta(),
    [],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      engine: engineRef.current!,
      config,
      updateConfig,
      messages,
      isStreaming,
      conversationId,
      setConversationId,
      send,
      sendFiles,
      abort,
      regenerate,
      editAndResend,
      clear,
      newConversation,
      deleteMessage,
      deleteConversation,
      listConversations,
      listConversationsMeta,
    }),
    [
      config,
      messages,
      isStreaming,
      conversationId,
      updateConfig,
      setConversationId,
      send,
      sendFiles,
      abort,
      regenerate,
      editAndResend,
      clear,
      newConversation,
      deleteMessage,
      deleteConversation,
      listConversations,
      listConversationsMeta,
    ],
  );

  return <ChatContext.Provider value={value}>{props.children}</ChatContext.Provider>;
}

/**
 * Hook to access the chat engine. Throws when used outside a ChatProvider.
 */
export function useChat(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) {
    throw new Error("useChat must be used inside <ChatProvider>");
  }
  return value;
}

/**
 * Variant of useChat that returns null instead of throwing. Use in
 * components that may render both inside and outside a provider.
 */
export function useOptionalChat(): ChatContextValue | null {
  return useContext(ChatContext);
}

/**
 * Default config helper for the MiniMax provider.
 */
export function defaultConfig(overrides: Partial<ChatConfig> = {}): ChatConfig {
  return buildDefaultMiniMaxConfig(overrides);
}

function shallowEqual(a: ChatConfig, b: ChatConfig): boolean {
  if (a === b) return true;
  if (a.model.id !== b.model.id) return false;
  if (a.provider.baseUrl !== b.provider.baseUrl) return false;
  if (a.provider.credentials.apiKey !== b.provider.credentials.apiKey) return false;
  if (a.systemPrompt !== b.systemPrompt) return false;
  if (a.temperature !== b.temperature) return false;
  return true;
}