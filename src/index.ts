/**
 * ai-schadcn-chat — public entry.
 *
 * Pick a surface that fits your need:
 *
 *   // One-shot: complete chat panel.
 *   import { ChatPanel, defaultConfig } from "ai-schadcn-chat";
 *   <ChatPanel config={defaultConfig()} />
 *
 *   // Build your own layout.
 *   import { ChatProvider, useChat, ChatHeader, MessageList, ChatComposer } from "ai-schadcn-chat";
 *   <ChatProvider config={cfg}>
 *     <ChatHeader />
 *     <MessageList />
 *     <ChatComposer />
 *   </ChatProvider>
 *
 *   // Pure framework-agnostic engine (no React).
 *   import { ChatEngine, createProvider } from "ai-schadcn-chat/lib";
 */

export * from "./types/index.js";
export * from "./lib/index.js";
export * from "./providers/index.js";
export * from "./hooks/index.js";
export * from "./components/index.js";

import { ChatPanel as _ChatPanel } from "./components/chat/ChatPanel.js";
import { defaultConfig as _defaultConfig } from "./hooks/useChat.js";

/** The all-in-one <ChatPanel /> component. */
export const ChatPanel = _ChatPanel;

/** A helper that builds a sensible default ChatConfig from env vars. */
export const defaultConfig = _defaultConfig;
export default _ChatPanel;