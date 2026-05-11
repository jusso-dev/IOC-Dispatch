import { cn } from "@/lib/utils";

function middleTruncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/**
 * Mono value display. Long values truncate in the middle visually.
 * NEVER rendered as a link; URLs in IntelRelay are user-submitted and may
 * be malicious. We display them as text only.
 */
export function MonoValue({
  value,
  max = 64,
  className,
  size = "sm",
}: {
  value: string;
  max?: number;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClass =
    size === "xs"
      ? "text-[11px]"
      : size === "md"
      ? "text-[13px]"
      : "text-[12.5px]";
  return (
    <span
      title={value}
      className={cn(
        "mono select-text break-all text-ink",
        sizeClass,
        className
      )}
    >
      {middleTruncate(value, max)}
    </span>
  );
}
