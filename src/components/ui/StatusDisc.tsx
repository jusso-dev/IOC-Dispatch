import { cn } from "@/lib/utils";

type Tone =
  | "ok"
  | "bad"
  | "warn"
  | "info"
  | "signal"
  | "muted"
  | "pending";

const TONE: Record<Tone, string> = {
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  info: "bg-info",
  signal: "bg-signal",
  muted: "bg-ink-mute",
  pending: "bg-ink-faint",
};

export function StatusDisc({
  tone = "muted",
  size = 8,
  className,
  ring = false,
}: {
  tone?: Tone;
  size?: 6 | 8 | 10;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-block shrink-0 rounded-full align-middle",
        TONE[tone],
        ring && "ring-2 ring-[var(--paper)] ring-offset-0",
        tone === "signal" &&
          "shadow-[0_0_0_2px_color-mix(in_oklch,var(--signal)_18%,transparent)]",
        className
      )}
    />
  );
}
