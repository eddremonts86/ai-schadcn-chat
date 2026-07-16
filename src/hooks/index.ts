// React-specific hooks. JSX lives in components/chat/ChatProvider.tsx
// and is re-exported here for the `@edd_remonts/ai-schadcn-chat/hooks` entry.
export {
  ChatProvider,
  useChat,
  useOptionalChat,
  defaultConfig,
  type ChatProviderProps,
  type ChatContextValue,
} from "../components/chat/ChatProvider.js";