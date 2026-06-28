/**
 * Public React hooks. Re-exports from the JSX provider file so consumers
 * import a single entry point: `import { useChat } from "ai-schadcn-chat/hooks"`.
 */
export {
  ChatProvider,
  useChat,
  useOptionalChat,
  defaultConfig,
  type ChatProviderProps,
  type ChatContextValue,
} from "../components/chat/ChatProvider.js";