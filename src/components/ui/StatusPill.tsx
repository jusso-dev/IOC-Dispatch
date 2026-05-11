import { Badge } from "@/components/ui/badge";
import { StatusDisc } from "@/components/ui/StatusDisc";

type Tone =
  | "ok"
  | "bad"
  | "warn"
  | "info"
  | "signal"
  | "muted"
  | "pending";

const TONE_FOR: Record<string, Tone> = {
  success: "ok",
  ok: "ok",
  parsed: "info",
  submitted: "ok",
  pending: "pending",
  failed: "bad",
  unsupported: "muted",
  disabled: "muted",
  skipped: "muted",
  rate_limited: "warn",
  manual_required: "warn",
};

const VARIANT_FOR: Record<Tone, "success" | "destructive" | "warning" | "info" | "signal" | "muted" | "default"> = {
  ok: "success",
  bad: "destructive",
  warn: "warning",
  info: "info",
  signal: "signal",
  muted: "muted",
  pending: "muted",
};

export function StatusPill({ status }: { status: string }) {
  const tone = TONE_FOR[status] ?? "muted";
  return (
    <Badge variant={VARIANT_FOR[tone]} className="gap-1.5">
      <StatusDisc tone={tone} size={6} />
      <span>{status.replace(/_/g, " ")}</span>
    </Badge>
  );
}
