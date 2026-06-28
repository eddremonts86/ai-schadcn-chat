/**
 * Public barrel — exports every component consumers can import from
 * `ai-schadcn-chat/components`.
 *
 * The chat sub-namespace is built on top of the official shadcn
 * `radix-rhea` blocks (Message / Bubble / Attachment / Marker /
 * MessageScroller), plus a thin local `MessageInput` adapter that the
 * shadcn-ui repo does not ship itself.
 */
export * from "./ui/button.js";
export * from "./ui/input.js";
export * from "./ui/card.js";
export * from "./ui/scroll-area.js";
export * from "./ui/avatar.js";
export * from "./ui/dropdown-menu.js";
export * from "./ui/popover.js";
export * from "./ui/tooltip.js";
export * from "./ui/switch.js";
export * from "./ui/dialog.js";
export * from "./ui/separator.js";
export * from "./ui/badge.js";
export * from "./ui/tabs.js";

// Chat provider + layout primitives.
export * from "./chat/ChatProvider.js";
export * from "./chat/ChatPanel.js";
export * from "./chat/ChatHeader.js";

// Official shadcn radix-rhea components, vendored locally.
export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
} from "./chat/Attachment.js";

export {
  BubbleGroup,
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "./chat/Chatbubble.js";

export {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "./chat/Message.js";

export {
  Marker,
  MarkerIcon,
  MarkerContent,
  markerVariants,
} from "./chat/MessageMarker.js";

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
  // Also export the local primitives so consumers that want to roll
  // their own styled wrapper can do so.
  MessageScroller as MessageScrollerPrimitive,
} from "./chat/MessageScroller.js";

// Local thin adapters (no equivalent in shadcn-ui).
export { MessageInput } from "./chat/MessageInput.js";
export { ChatComposer } from "./chat/ChatComposer.js";
export { MessageList } from "./chat/MessageList.js";