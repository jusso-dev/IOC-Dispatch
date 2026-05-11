import { StatusDisc } from "@/components/ui/StatusDisc";
import { listProviders } from "@/lib/providers/registry";
import { redisHealth } from "@/lib/redis";
import { prisma } from "@/lib/db";

async function snapshot() {
  const [providers, redis, dbOk] = await Promise.all([
    Promise.all(
      listProviders().map(async (p) => ({ id: p.id, status: await p.getStatus() }))
    ),
    redisHealth(),
    prisma.$queryRawUnsafe(`SELECT 1`).then(
      () => true,
      () => false
    ),
  ]);
  const available = providers.filter((p) => p.status.available).length;
  return {
    providersAvailable: available,
    providersTotal: providers.length,
    redisOk: redis.ok,
    dbOk: !!dbOk,
  };
}

export async function MetaRail() {
  const snap = await snapshot().catch(() => ({
    providersAvailable: 0,
    providersTotal: 0,
    redisOk: false,
    dbOk: false,
  }));

  return (
    <aside
      aria-label="environment"
      className="hidden w-44 shrink-0 border-r border-rule bg-paper-sunken/40 lg:block"
    >
      <div className="sticky top-[57px] px-4 py-5">
        <div className="space-y-5 mono text-[11px] uppercase tracking-widest text-ink-faint">
          <Row label="env">
            <span className="text-ink-dim">localhost</span>
          </Row>
          <Row label="db">
            <span className="inline-flex items-center gap-1.5">
              <StatusDisc tone={snap.dbOk ? "ok" : "bad"} />
              <span className="text-ink-dim">
                {snap.dbOk ? "ready" : "down"}
              </span>
            </span>
          </Row>
          <Row label="redis">
            <span className="inline-flex items-center gap-1.5">
              <StatusDisc tone={snap.redisOk ? "ok" : "bad"} />
              <span className="text-ink-dim">
                {snap.redisOk ? "ready" : "down"}
              </span>
            </span>
          </Row>
          <Row label="providers">
            <span className="tabular-nums text-ink-dim">
              {snap.providersAvailable}
              <span className="text-ink-mute">/</span>
              {snap.providersTotal}
            </span>
          </Row>
        </div>
        <div className="mt-8 border-t border-rule-faint pt-4">
          <p className="mono text-[10px] uppercase tracking-widest text-ink-mute">
            handle as ioc.
          </p>
          <p className="mt-2 text-[11px] leading-snug text-ink-faint">
            Submitted URLs are never rendered as clickable links. The app does
            not fetch them.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-mute">{label}</span>
      <span className="text-right normal-case tracking-normal mono text-[11px]">
        {children}
      </span>
    </div>
  );
}
