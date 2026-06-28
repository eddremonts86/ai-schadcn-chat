/**
 * Avatar shown next to each message bubble. Renders initials derived
 * from `name` with a stable colour seed so the same name keeps the
 * same colour across re-renders.
 */
import { AvatarFallback, AvatarImage, AvatarRoot, avatarForeground, avatarHue, avatarLetter } from "../ui/avatar.js";
import { cn } from "../../lib/utils.js";

export interface BubbleAvatarProps {
  name: string;
  role: "user" | "assistant" | "system" | "tool";
  imageUrl?: string;
  className?: string;
}

export function BubbleAvatar({ name, role, imageUrl, className }: BubbleAvatarProps) {
  const seed = `${role}:${name}`;
  return (
    <AvatarRoot className={cn("h-8 w-8", className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
      <AvatarFallback
        style={{
          backgroundColor: avatarHue(seed),
          color: avatarForeground(seed),
        }}
      >
        {avatarLetter(name)}
      </AvatarFallback>
    </AvatarRoot>
  );
}
