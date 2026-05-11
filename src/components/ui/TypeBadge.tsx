import { Badge } from "@/components/ui/badge";
import type { IndicatorType } from "@/lib/indicators/types";

const SHORT: Record<IndicatorType, string> = {
  url: "URL",
  domain: "DOM",
  ipv4: "IP4",
  md5: "MD5",
  sha1: "SH1",
  sha256: "S26",
  email: "EML",
  unknown: "???",
};

const VARIANT: Record<
  IndicatorType,
  | "default"
  | "outline"
  | "secondary"
  | "muted"
  | "destructive"
  | "info"
  | "warning"
> = {
  url: "default",
  domain: "default",
  ipv4: "info",
  md5: "secondary",
  sha1: "secondary",
  sha256: "secondary",
  email: "secondary",
  unknown: "destructive",
};

export function TypeBadge({ type }: { type: IndicatorType }) {
  return (
    <Badge
      variant={VARIANT[type]}
      title={type}
      className="tabular-nums tracking-[0.14em]"
    >
      {SHORT[type]}
    </Badge>
  );
}
