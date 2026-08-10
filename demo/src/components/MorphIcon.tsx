import { MorphIcon, type MorphIconProps } from "morphicons/react";

/**
 * Shared morphing-icon wrapper for the landing. Centralizes the defaults so
 * every toggle icon behaves the same: a subtle "snappy" spring, a 2px stroke
 * to match Lucide's static icons, and reducedMotion="user" so morphs collapse
 * to an instant swap while the OS "reduce motion" setting is on.
 *
 * Icons come from the `lucide` DATA package (not lucide-react), e.g.
 * `import { Copy, Check } from "lucide"`, passed via the `icon` prop.
 */
export function Morph({
  spring = "snappy",
  reducedMotion = "user",
  strokeWidth = 2,
  ...rest
}: Readonly<MorphIconProps>) {
  return (
    <MorphIcon
      spring={spring}
      reducedMotion={reducedMotion}
      strokeWidth={strokeWidth}
      {...rest}
    />
  );
}
