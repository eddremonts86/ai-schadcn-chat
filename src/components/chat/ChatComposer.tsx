/**
 * Re-export of `MessageInput` to preserve the historical `ChatComposer`
 * import path. The composer has been re-implemented on top of the
 * official shadcn `Attachment` block (see `./MessageInput.tsx`).
 *
 * The `ChatComposer` interface intentionally matches what the original
 * composer exposed: callers can keep using `<ChatComposer />` with no
 * changes.
 */
export {
  MessageInput as ChatComposer,
  type MessageInputProps as ChatComposerProps,
} from "./MessageInput.js";