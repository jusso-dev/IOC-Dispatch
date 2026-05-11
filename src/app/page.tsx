import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/Section";
import { StatusDisc } from "@/components/ui/StatusDisc";
import { MonoValue } from "@/components/ui/MonoValue";
import { prisma } from "@/lib/db";
import { listProviders } from "@/lib/providers/registry";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [recent, providerStatus] = await Promise.all([
    safeBatches(),
    Promise.all(
      listProviders().map(async (p) => ({
        id: p.id,
        name: p.name,
        publicSubmissionPossible: p.publicSubmissionPossible,
        status: await p.getStatus(),
      }))
    ),
  ]);

  const available = providerStatus.filter((p) => p.status.available).length;
  const total = providerStatus.length;

  return (
    <div className="space-y-12">
      {/* HERO — blueprint banner, no hero metric */}
      <section className="relative isolate overflow-hidden border border-rule bg-paper">
        <div className="bg-blueprint absolute inset-0 -z-10 opacity-40" />
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-2 mono text-[10px] text-ink-mute"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-2 mono text-[10px] text-ink-mute"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 bottom-2 mono text-[10px] text-ink-mute"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 mono text-[10px] text-ink-mute"
        >
          +
        </span>
        <div className="grid gap-8 px-8 py-10 md:grid-cols-[1.4fr_1fr] md:gap-12 md:px-12 md:py-14">
          <div className="space-y-5">
            <div className="flex items-baseline gap-3">
              <span className="mono text-[10px] font-semibold uppercase tracking-widest text-ink-mute">
                [00] manifest
              </span>
              <span className="mono text-[10px] uppercase tracking-widest text-ink-mute">
                v0.1 · operator console
              </span>
            </div>
            <h1 className="mono text-[28px] font-medium leading-[1.1] tracking-tight text-ink md:text-[34px]">
              Route indicators
              <br className="hidden md:block" />
              <span className="text-ink-dim">to the providers</span>
              <br className="hidden md:block" />
              <span className="text-ink-dim">that accept them.</span>
            </h1>
            <p className="max-w-[58ch] text-[14px] leading-relaxed text-ink-dim">
              Paste a list of indicators. IntelRelay parses, normalizes, and
              dispatches each one only to providers that support its type.
              Browser-automation fallbacks exist for providers without an API,
              and are off by default.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild variant="primary" size="lg">
                <Link href="/submit">paste indicators →</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/settings/providers">provider matrix</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <Badge variant="outline">URL</Badge>
              <Badge variant="outline">IP4</Badge>
              <Badge variant="outline">DOM</Badge>
              <Badge variant="outline">MD5</Badge>
              <Badge variant="outline">SH1</Badge>
              <Badge variant="outline">S26</Badge>
              <Badge variant="outline">EML</Badge>
              <span className="mono text-[10px] uppercase tracking-widest text-ink-mute">
                supported indicator types
              </span>
            </div>
          </div>

          {/* Sample preview pane (decorative but accurate) */}
          <div className="border border-rule-faint bg-paper-sunken/70 p-4 mono text-[12px] leading-snug text-ink-dim">
            <div className="flex items-baseline justify-between border-b border-rule-faint pb-2 mb-2 text-[10px] uppercase tracking-widest text-ink-mute">
              <span>preview / batch 7f3a1c</span>
              <span>{available}/{total} prov</span>
            </div>
            <SampleRow type="URL" value="http://bad.example/a.exe" route="urlhaus:submit · virustotal:lookup" />
            <SampleRow type="URL" value="https://evil.example/login?x=1" route="urlscan:scan · urlhaus:submit" />
            <SampleRow type="IP4" value="8.8.8.8" route="abuseipdb:lookup · virustotal:lookup" />
            <SampleRow type="DOM" value="example.com" route="urlscan:scan · virustotal:lookup" />
            <SampleRow type="MD5" value="44d88612fea8a8f36de82e1278abb02f" route="virustotal:lookup" />
            <SampleRow type="EML" value="user@example.com" route="misp:submit" />
            <div className="mt-2 border-t border-rule-faint pt-2 text-[10px] uppercase tracking-widest text-ink-mute">
              6 ioc · 4 prov · 9 attempt
            </div>
          </div>
        </div>
      </section>

      <Alert variant="warning">
        <div>
          <AlertTitle>Some submissions become public.</AlertTitle>
          <AlertDescription>
            URLhaus, AbuseIPDB reports, and urlscan public scans appear in
            globally searchable databases. Use{" "}
            <span className="mono text-ink">lookup</span> mode if you want
            enrichment without reporting.
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid gap-10 md:grid-cols-2 md:gap-12">
        <Section
          label="providers"
          registerMark="01"
          title="Provider matrix"
          meta={
            <span className="tabular-nums">
              {available}
              <span className="text-ink-mute"> / </span>
              {total} ready
            </span>
          }
        >
          <ul className="divide-y divide-rule-faint border border-rule">
            {providerStatus.map((p) => {
              const tone = p.status.available
                ? "ok"
                : p.status.enabled
                ? "warn"
                : "muted";
              return (
                <li key={p.id} className="flex items-center justify-between px-3 py-2.5">
                  <Link
                    href={`/settings/providers/${p.id}`}
                    className="flex items-baseline gap-2 group"
                  >
                    <span className="mono text-[12px] text-ink group-hover:text-signal">
                      {p.name}
                    </span>
                    {p.publicSubmissionPossible && (
                      <span className="mono text-[9px] uppercase tracking-widest text-ink-mute">
                        public
                      </span>
                    )}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 mono text-[10px] uppercase tracking-widest text-ink-faint">
                    <StatusDisc tone={tone} />
                    {p.status.available
                      ? "ready"
                      : p.status.enabled
                      ? "no creds"
                      : "off"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          label="batches"
          registerMark="02"
          title="Recent activity"
          meta={
            <Link
              href="/batches"
              className="hover:text-ink"
            >
              full log →
            </Link>
          }
        >
          {recent.length === 0 ? (
            <div className="bg-blueprint border border-rule bg-paper-sunken/40 px-4 py-12 text-center">
              <p className="mono text-[12px] uppercase tracking-widest text-ink-faint">
                no batches yet
              </p>
              <p className="mt-2 text-[12.5px] text-ink-dim">
                Paste a list of indicators to create the first one.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/submit">new batch</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-rule-faint border border-rule">
              {recent.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <Link
                    href={`/batches/${b.id}`}
                    className="flex min-w-0 items-baseline gap-2"
                  >
                    <span className="mono text-[12px] text-ink-faint">
                      <MonoValue value={b.id} max={10} size="sm" />
                    </span>
                    <span className="truncate text-[13px] text-ink">
                      {b.name ?? "—"}
                    </span>
                  </Link>
                  <div className="flex items-center gap-3 mono text-[11px] uppercase tracking-widest text-ink-faint">
                    <Badge variant="outline">{b.mode}</Badge>
                    <span className="tabular-nums">
                      {b.totalCount}
                      <span className="text-ink-mute">ioc</span>
                    </span>
                    <span className="text-ink-mute">
                      {formatDate(b.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function SampleRow({
  type,
  value,
  route,
}: {
  type: string;
  value: string;
  route: string;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-baseline gap-3 py-1">
      <span className="mono text-[10px] text-ink-mute tabular-nums">{type}</span>
      <MonoValue value={value} max={40} size="xs" className="text-ink-dim" />
      <span className="mono text-[10px] text-ink-mute">{route}</span>
    </div>
  );
}

async function safeBatches() {
  try {
    return await prisma.submissionBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    });
  } catch {
    return [];
  }
}
