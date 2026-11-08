import * as Ph from "@phosphor-icons/react/dist/ssr";

/** Server-rendered Phosphor icon by name (landing copy refers to icons by string). */
export function Icon({ name, weight = "bold", size = 18, className }: { name: string; weight?: "bold" | "fill" | "regular"; size?: number; className?: string }) {
  const C = (Ph as unknown as Record<string, React.ComponentType<{ weight?: string; size?: number; className?: string }>>)[name];
  return C ? <C weight={weight} size={size} className={className} /> : null;
}
