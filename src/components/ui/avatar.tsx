import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "../../lib/utils.js";

export const avatarClasses = "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full";
export const avatarImageClasses = "aspect-square h-full w-full";
export const avatarFallbackClasses =
  "flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium uppercase";

export const avatarLetter = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";

export const avatarHue = (seed?: string): string => {
  const text = (seed ?? "x").trim();
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}deg 70% 88%)`;
};

export const avatarForeground = (seed?: string): string => {
  const text = (seed ?? "x").trim();
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 17 + text.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}deg 40% 25%)`;
};

export const AvatarRoot = forwardRef<
  ElementRef<typeof AvatarPrimitive.Root>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarClasses, className)}
    {...props}
  />
));
AvatarRoot.displayName = "AvatarRoot";

export const AvatarImage = forwardRef<
  ElementRef<typeof AvatarPrimitive.Image>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn(avatarImageClasses, className)}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = forwardRef<
  ElementRef<typeof AvatarPrimitive.Fallback>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(avatarFallbackClasses, className)}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";