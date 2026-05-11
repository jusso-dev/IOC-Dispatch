import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatusDisc } from "@/components/ui/StatusDisc";
import { TypeBadge } from "@/components/ui/TypeBadge";
import {
  type IndicatorType,
} from "@/lib/indicators/types";
import type {
  ProviderCapability,
  ProviderTransport,
} from "@/lib/providers/types";

export interface ProviderCardData {
  id: string;
  name: string;
  description: string;
  supportedTypes: IndicatorType[];
  capabilities: ProviderCapability[];
  preferredTransport: ProviderTransport;
  availableTransports: ProviderTransport[];
  publicSubmissionPossible: boolean;
  warning?: string;
  status: {
    enabled: boolean;
    configured: boolean;
    available: boolean;
    reason?: string;
  };
}

function discTone(status: ProviderCardData["status"]) {
  if (status.available) return "ok" as const;
  if (status.enabled && !status.configured) return "warn" as const;
  return "muted" as const;
}

export function ProviderStatusCard({ p }: { p: ProviderCardData }) {
  const tone = discTone(p.status);
  return (
    <article className="group relative flex flex-col gap-3 border border-rule bg-paper-raised px-4 py-3.5 transition-colors duration-120 hover:border-rule-strong">
      {/* register marks */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1 top-1 mono text-[8px] text-ink-mute"
      >
        +
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-1 top-1 mono text-[8px] text-ink-mute"
      >
        +
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1 bottom-1 mono text-[8px] text-ink-mute"
      >
        +
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-1 bottom-1 mono text-[8px] text-ink-mute"
      >
        +
      </span>

      <header className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="mono text-[13px] font-semibold tracking-tight text-ink">
            <Link
              href={`/settings/providers/${p.id}`}
              className="hover:text-signal"
            >
              {p.name}
            </Link>
          </h3>
          <p className="mono text-[10px] uppercase tracking-widest text-ink-mute">
            {p.id}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 mono text-[10px] uppercase tracking-widest">
          <StatusDisc tone={tone} />
          <span className="text-ink-faint">
            {p.status.available
              ? "ready"
              : p.status.enabled
              ? "no creds"
              : "off"}
          </span>
        </span>
      </header>

      <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-dim">
        {p.description}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        {p.supportedTypes.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {p.capabilities.map((c) => (
          <Badge key={c} variant="outline">
            {c}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule-faint pt-2">
        <div className="flex flex-wrap items-center gap-1">
          {p.availableTransports.map((t) => (
            <Badge
              key={t}
              variant={t === "playwright" ? "warning" : "muted"}
            >
              {t}
            </Badge>
          ))}
        </div>
        {p.publicSubmissionPossible && (
          <Badge variant="signal">[ public ]</Badge>
        )}
      </div>

      {p.status.reason && (
        <p className="mono text-[10px] uppercase tracking-widest text-ink-mute">
          {p.status.reason}
        </p>
      )}
    </article>
  );
}
