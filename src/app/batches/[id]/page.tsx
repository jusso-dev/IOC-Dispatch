import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonoValue } from "@/components/ui/MonoValue";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Section } from "@/components/ui/Section";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { RawResponse } from "@/components/batches/RawResponse";
import { DeleteBatchButton } from "@/components/batches/DeleteBatchButton";
import type { IndicatorType } from "@/lib/indicators/types";

export const dynamic = "force-dynamic";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await prisma.submissionBatch
    .findUnique({
      where: { id },
      include: {
        indicators: {
          orderBy: { createdAt: "asc" },
          include: { attempts: { orderBy: { createdAt: "asc" } } },
        },
      },
    })
    .catch(() => null);

  if (!batch) notFound();

  const totalAttempts = batch.indicators.reduce(
    (acc, i) => acc + i.attempts.length,
    0
  );

  return (
    <div className="space-y-10">
      {/* HEADER BAND */}
      <header className="border border-rule bg-paper-raised">
        <div className="border-b border-rule-faint px-5 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-baseline gap-3 mono text-[10px] uppercase tracking-widest text-ink-mute">
                <span>[04] batch</span>
                <MonoValue value={batch.id} max={20} size="xs" className="text-ink-faint" />
              </div>
              <h1 className="mono text-[22px] font-medium tracking-tight text-ink">
                {batch.name ?? <span className="text-ink-dim">unnamed</span>}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/batches/${batch.id}/export?format=json`}>json</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/batches/${batch.id}/export?format=csv`}>csv</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/batches/${batch.id}/export?format=txt`}>txt</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/batches/${batch.id}/export?format=misp`}>misp</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/batches/${batch.id}/export?format=stix`}>stix 2.1</Link>
              </Button>
              <DeleteBatchButton batchId={batch.id} />
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-6 divide-x divide-rule-faint">
          <Stat label="mode">
            <Badge variant="outline">{batch.mode}</Badge>
          </Stat>
          <Stat label="status">
            <Badge variant="muted">{batch.status}</Badge>
          </Stat>
          <Stat label="ioc">
            <span className="mono text-[15px] tabular-nums text-ink">
              {batch.totalCount}
            </span>
          </Stat>
          <Stat label="ok">
            <span className="mono text-[15px] tabular-nums text-ok">
              {batch.submittedCount}
            </span>
          </Stat>
          <Stat label="failed">
            <span className="mono text-[15px] tabular-nums text-bad">
              {batch.failedCount}
            </span>
          </Stat>
          <Stat label="skipped">
            <span className="mono text-[15px] tabular-nums text-ink-faint">
              {batch.skippedCount}
            </span>
          </Stat>
        </dl>
        <div className="grid gap-x-6 gap-y-3 border-t border-rule-faint px-5 py-3 md:grid-cols-3 mono text-[11px] uppercase tracking-widest text-ink-faint">
          <KV label="providers">
            {batch.selectedProviders.length ? (
              batch.selectedProviders.join(" · ")
            ) : (
              <span className="text-ink-mute">—</span>
            )}
          </KV>
          <KV label="tags">
            {batch.tags.length ? (
              batch.tags.join(" · ")
            ) : (
              <span className="text-ink-mute">—</span>
            )}
          </KV>
          <KV label="created">{formatDate(batch.createdAt)}</KV>
        </div>
      </header>

      <Section
        label="indicators"
        registerMark="05"
        title="Per-indicator log"
        meta={
          <span>
            <span className="tabular-nums">{batch.indicators.length}</span> rows{" "}
            <span className="text-ink-mute">·</span>{" "}
            <span className="tabular-nums">{totalAttempts}</span> attempts
          </span>
        }
      >
        <div className="space-y-3">
          {batch.indicators.map((ind, i) => (
            <article
              key={ind.id}
              className="border border-rule bg-paper-raised"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-faint px-4 py-2.5">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="mono text-[10px] tabular-nums text-ink-mute">
                    {String(i + 1).padStart(3, "0")}
                  </span>
                  <TypeBadge type={ind.type as IndicatorType} />
                  <MonoValue
                    value={ind.normalizedValue}
                    max={80}
                    size="sm"
                    className="text-ink"
                  />
                </div>
                <StatusPill status={ind.status} />
              </header>
              {ind.warning && (
                <p className="border-b border-rule-faint bg-paper-sunken/40 px-4 py-1.5 mono text-[10.5px] uppercase tracking-widest text-warn">
                  {ind.warning}
                </p>
              )}
              {ind.originalValue !== ind.normalizedValue && (
                <p className="border-b border-rule-faint bg-paper-sunken/40 px-4 py-1.5 mono text-[10.5px] uppercase tracking-widest text-ink-mute">
                  orig:{" "}
                  <MonoValue
                    value={ind.originalValue}
                    max={80}
                    size="xs"
                    className="text-ink-faint normal-case tracking-normal"
                  />
                </p>
              )}

              {ind.attempts.length === 0 ? (
                <p className="px-4 py-3 mono text-[11px] uppercase tracking-widest text-ink-mute">
                  no provider attempts · filtered by routing
                </p>
              ) : (
                <ul className="divide-y divide-rule-faint">
                  {ind.attempts.map((a) => (
                    <li
                      key={a.id}
                      className="grid gap-3 px-4 py-3 lg:grid-cols-[180px_90px_90px_140px_1fr_auto]"
                    >
                      <div className="space-y-0.5">
                        <div className="mono text-[12px] font-semibold text-ink">
                          {a.providerId}
                        </div>
                        <div className="mono text-[10px] uppercase tracking-widest text-ink-mute tabular-nums">
                          {formatDate(a.completedAt ?? a.createdAt)}
                        </div>
                      </div>
                      <div className="mono text-[11px] uppercase tracking-widest text-ink-faint">
                        <span className="block text-[9px] text-ink-mute">
                          action
                        </span>
                        {a.action}
                      </div>
                      <div>
                        <span className="block mono text-[9px] uppercase tracking-widest text-ink-mute">
                          transport
                        </span>
                        <Badge
                          variant={
                            a.transport === "playwright" ? "warning" : "outline"
                          }
                        >
                          {a.transport}
                        </Badge>
                      </div>
                      <div>
                        <span className="block mono text-[9px] uppercase tracking-widest text-ink-mute">
                          status
                        </span>
                        <StatusPill status={a.status} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        {a.externalUrl ? (
                          <div>
                            <span className="block mono text-[9px] uppercase tracking-widest text-ink-mute">
                              external
                            </span>
                            <MonoValue
                              value={a.externalUrl}
                              max={56}
                              size="xs"
                              className="text-ink-faint"
                            />
                          </div>
                        ) : a.externalId ? (
                          <div>
                            <span className="block mono text-[9px] uppercase tracking-widest text-ink-mute">
                              external id
                            </span>
                            <MonoValue
                              value={a.externalId}
                              max={40}
                              size="xs"
                              className="text-ink-faint"
                            />
                          </div>
                        ) : null}
                        {a.errorMessage && (
                          <p
                            className={`mono text-[11px] ${
                              a.status === "success"
                                ? "text-ink-dim"
                                : a.status === "rate_limited" ||
                                  a.status === "manual_required"
                                ? "text-warn"
                                : "text-bad"
                            }`}
                          >
                            {a.errorMessage}
                          </p>
                        )}
                        {a.screenshotPath && (
                          <p className="mono text-[10px] uppercase tracking-widest text-ink-mute">
                            screenshot: {a.screenshotPath}
                          </p>
                        )}
                      </div>
                      <div className="flex items-start justify-end">
                        <RawResponse data={a.responsePayload} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-mute">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function KV({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-ink-mute">{label}:</span>
      <span className="min-w-0 truncate normal-case tracking-normal text-ink-dim">
        {children}
      </span>
    </div>
  );
}
