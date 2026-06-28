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
} from "../../types/chat.js";
import { ChatEngine as ChatEngineImpl } from "../../lib/chat-engine.js";
import { buildDefaultMiniMaxConfig } from "../../types/presets.js";

export interface ChatContextValue {
  engine: ChatEngineImpl;
  config: ChatConfig;
  updateConfig: (partial: Partial<ChatConfig>) => void;
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
  deleteConversation: (id: string) => void;
  listConversations: () => string[];
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

  const messages = useSyncExternalStore(
    (cb) => engineRef.current!.subscribe(cb),
    () => engineRef.current!.getMessages(),
    () => engineRef.current!.getMessages(),
  );
  const config = useSyncExternalStore(
    (cb) => engineRef.current!.subscribe(cb),
    () => engineRef.current!.getConfig(),
    () => engineRef.current!.getConfig(),
  );
  const conversationId = useSyncExternalStore(
    (cb) => engineRef.current!.subscribe(cb),
    () => engineRef.current!.getActiveConversationId(),
    () => engineRef.current!.getActiveConversationId(),
  );
  const isStreaming = useSyncExternalStore(
    (cb) => engineRef.current!.subscribe(cb),
    () => engineRef.current!.getMessages().some((m: ChatMessage) => m.status === "streaming"),
    () => engineRef.current!.getMessages().some((m: ChatMessage) => m.status === "streaming"),
  );

  const updateConfig = useCallback((partial: Partial<ChatConfig>) => {
    engineRef.current!.updateConfig(partial);
  }, []);

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
  const deleteConversation = useCallback((id: string) => {
    engineRef.current!.deleteConversation(id);
  }, []);
  const listConversations = useCallback(() => engineRef.current!.listConversationIds(), []);

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
      deleteConversation,
      listConversations,
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
      deleteConversation,
      listConversations,
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