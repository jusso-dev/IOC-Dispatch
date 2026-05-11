import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonoValue } from "@/components/ui/MonoValue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const batches = await safeBatches();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-ink-mute">
            [03] activity log
          </div>
          <h1 className="mt-1 mono text-[24px] font-medium tracking-tight text-ink">
            Batches
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Every submission becomes a logged batch with per-indicator,
            per-provider attempts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="primary" size="sm">
            <Link href="/submit">new batch →</Link>
          </Button>
        </div>
      </header>

      {!batches.length ? (
        <div className="bg-blueprint border border-rule bg-paper-sunken/40 px-6 py-16 text-center">
          <p className="mono text-[11px] uppercase tracking-widest text-ink-faint">
            no batches yet
          </p>
          <p className="mt-2 text-[13px] text-ink-dim">
            Paste a list of indicators to create the first batch.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link href="/submit">paste indicators</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">id</TableHead>
              <TableHead>name</TableHead>
              <TableHead className="w-[100px]">mode</TableHead>
              <TableHead className="w-[60px] text-right">ioc</TableHead>
              <TableHead className="w-[60px] text-right">ok</TableHead>
              <TableHead className="w-[60px] text-right">fail</TableHead>
              <TableHead className="w-[60px] text-right">skip</TableHead>
              <TableHead>providers</TableHead>
              <TableHead className="w-[110px]">status</TableHead>
              <TableHead className="w-[180px]">created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Link
                    href={`/batches/${b.id}`}
                    className="mono text-[12px] text-ink-dim hover:text-signal"
                  >
                    <MonoValue value={b.id} max={12} size="sm" />
                  </Link>
                </TableCell>
                <TableCell className="text-[13px] text-ink">
                  {b.name ?? <span className="text-ink-mute">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{b.mode}</Badge>
                </TableCell>
                <TableCell className="text-right mono text-[12px] tabular-nums">
                  {b.totalCount}
                </TableCell>
                <TableCell className="text-right mono text-[12px] tabular-nums text-ok">
                  {b.submittedCount || <span className="text-ink-mute">·</span>}
                </TableCell>
                <TableCell className="text-right mono text-[12px] tabular-nums text-bad">
                  {b.failedCount || <span className="text-ink-mute">·</span>}
                </TableCell>
                <TableCell className="text-right mono text-[12px] tabular-nums text-ink-faint">
                  {b.skippedCount || <span className="text-ink-mute">·</span>}
                </TableCell>
                <TableCell className="mono text-[11px] uppercase tracking-widest text-ink-faint">
                  {b.selectedProviders.length ? (
                    b.selectedProviders.join(" · ")
                  ) : (
                    <span className="text-ink-mute">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="muted">{b.status}</Badge>
                </TableCell>
                <TableCell className="mono text-[11px] uppercase tracking-widest text-ink-mute">
                  {formatDate(b.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

async function safeBatches() {
  try {
    return await prisma.submissionBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch {
    return [];
  }
}
