import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonoValue } from "@/components/ui/MonoValue";
import { Section } from "@/components/ui/Section";
import { StatusDisc } from "@/components/ui/StatusDisc";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { getProvider } from "@/lib/providers/registry";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const p = getProvider(providerId);
  if (!p) notFound();

  const status = await p.getStatus();

  const [lastSuccess, lastError, totalAttempts] = await Promise.all([
    prisma.providerAttempt
      .findFirst({
        where: { providerId, status: "success" },
        orderBy: { completedAt: "desc" },
      })
      .catch(() => null),
    prisma.providerAttempt
      .findFirst({
        where: { providerId, status: { in: ["failed", "rate_limited"] } },
        orderBy: { completedAt: "desc" },
      })
      .catch(() => null),
    prisma.providerAttempt.count({ where: { providerId } }).catch(() => 0),
  ]);

  const tone = status.available
    ? "ok"
    : status.enabled
    ? "warn"
    : "muted";

  return (
    <div className="space-y-8">
      <header className="border border-rule bg-paper-raised">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule-faint px-5 py-3">
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-ink-mute">
              [06] provider
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <h1 className="mono text-[22px] font-medium tracking-tight text-ink">
                {p.name}
              </h1>
              <span className="mono text-[12px] uppercase tracking-widest text-ink-mute">
                {p.id}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 mono text-[11px] uppercase tracking-widest text-ink-faint">
              <StatusDisc tone={tone} />
              {status.available
                ? "ready"
                : status.enabled
                ? "missing creds"
                : "disabled"}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/providers">all providers</Link>
            </Button>
          </div>
        </div>
        <p className="px-5 py-3 max-w-[80ch] text-[13px] text-ink-dim">
          {p.description}
        </p>
      </header>

      {p.warning && (
        <Alert variant="warning">
          <div>
            <AlertTitle>Heads up.</AlertTitle>
            <AlertDescription>{p.warning}</AlertDescription>
          </div>
        </Alert>
      )}

      <Section label="capabilities" registerMark="01" title="What it does">
        <dl className="grid gap-x-6 gap-y-4 border border-rule bg-paper-raised p-5 md:grid-cols-3">
          <Field label="supported types">
            <div className="flex flex-wrap items-center gap-1.5">
              {p.supportedTypes.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>
          </Field>
          <Field label="capabilities">
            <div className="flex flex-wrap items-center gap-1.5">
              {p.capabilities.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
          </Field>
          <Field label="transports">
            <div className="flex flex-wrap items-center gap-1.5">
              {p.availableTransports.map((t) => (
                <Badge
                  key={t}
                  variant={t === "playwright" ? "warning" : "muted"}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </Field>
          <Field label="requires api key">
            <span className="mono text-[12px] text-ink-dim">
              {p.requiresApiKey ? "yes" : "no"}
            </span>
          </Field>
          <Field label="requires login">
            <span className="mono text-[12px] text-ink-dim">
              {p.requiresLogin ? "yes" : "no"}
            </span>
          </Field>
          <Field label="public submission">
            {p.publicSubmissionPossible ? (
              <Badge variant="signal">[ possible ]</Badge>
            ) : (
              <span className="mono text-[12px] text-ink-dim">no</span>
            )}
          </Field>
        </dl>
      </Section>

      <Section
        label="environment"
        registerMark="02"
        title="Env vars"
        description="Read on the server only. Values are never returned to the browser."
      >
        <ul className="divide-y divide-rule-faint border border-rule bg-paper-sunken">
          {p.envVars.map((v) => (
            <li
              key={v}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="mono text-[12.5px] text-ink">{v}</span>
              <span className="mono text-[10px] uppercase tracking-widest text-ink-mute">
                server-side
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="activity" registerMark="03" title="Recent attempts">
        <div className="grid gap-3 md:grid-cols-3">
          <KVBox label="total attempts">
            <span className="mono text-[20px] tabular-nums text-ink">
              {totalAttempts}
            </span>
          </KVBox>
          <KVBox label="last success">
            {lastSuccess ? (
              <div className="space-y-1">
                <div className="mono text-[11px] uppercase tracking-widest text-ink-faint">
                  {formatDate(lastSuccess.completedAt ?? lastSuccess.createdAt)}
                </div>
                <MonoValue
                  value={
                    lastSuccess.externalUrl ?? lastSuccess.externalId ?? "ok"
                  }
                  max={48}
                  size="xs"
                  className="text-ink-dim"
                />
              </div>
            ) : (
              <span className="mono text-[12px] text-ink-mute">—</span>
            )}
          </KVBox>
          <KVBox label="last error">
            {lastError ? (
              <div className="space-y-1">
                <div className="mono text-[11px] uppercase tracking-widest text-ink-faint">
                  {formatDate(lastError.completedAt ?? lastError.createdAt)}
                </div>
                <p className="mono text-[11.5px] text-bad">
                  {lastError.errorMessage ?? "(no message)"}
                </p>
              </div>
            ) : (
              <span className="mono text-[12px] text-ink-mute">—</span>
            )}
          </KVBox>
        </div>
      </Section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <dt className="mono text-[10px] uppercase tracking-widest text-ink-mute">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function KVBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-rule bg-paper-raised px-4 py-3">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-mute">
        {label}
      </div>
      <div className="mt-2 min-h-[44px]">{children}</div>
    </div>
  );
}
