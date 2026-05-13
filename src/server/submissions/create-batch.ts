import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { moduleLogger } from "@/lib/logger";
import type { ParsedIndicator } from "@/lib/indicators/types";
import type { SubmissionMode } from "@/lib/providers/types";
import { getProvider } from "@/lib/providers/registry";
import { getQueues, QUEUE_NAMES } from "@/server/queues/bullmq";
import { processProviderAttempt } from "./process-provider-attempt";
import { getEligibleProviderActions } from "./routing";

const log = moduleLogger("create-batch");

export interface CreateBatchInput {
  name?: string;
  notes?: string;
  tags: string[];
  mode: SubmissionMode;
  indicators: ParsedIndicator[];
  selectedProviderIds: string[];
  comment?: string;
  providerExtras?: Record<string, Record<string, unknown>>;
}

export interface CreatedBatchSummary {
  batchId: string;
  totalIndicators: number;
  totalAttempts: number;
  queued: number;
  syncCompleted: number;
}

interface PlannedAttempt {
  indicatorId: string;
  providerId: string;
  action: string;
  transport: string;
}

/**
 * Build a new submission batch end-to-end: persist the batch + indicators +
 * planned provider attempts in a single transaction, then either run them
 * inline (small batches) or enqueue them on BullMQ (large batches).
 *
 * The transaction guarantees we never end up with orphaned indicators or
 * half-planned attempts on a partial failure. Queue dispatch is deliberately
 * outside the transaction so a Redis hiccup can't roll back database state.
 */
export async function createSubmissionBatch(
  input: CreateBatchInput
): Promise<CreatedBatchSummary> {
  if (!input.indicators.length) {
    throw new Error("createSubmissionBatch requires at least one indicator");
  }

  const planned: PlannedAttempt[] = [];

  const { batch, attemptIds } = await prisma.$transaction(async (tx) => {
    const batch = await tx.submissionBatch.create({
      data: {
        name: input.name,
        notes: input.notes,
        tags: input.tags,
        mode: input.mode,
        status: "processing",
        totalCount: input.indicators.length,
        selectedProviders: input.selectedProviderIds,
      },
    });

    const indicatorRows = await Promise.all(
      input.indicators.map((ind) =>
        tx.submissionIndicator.create({
          data: {
            batchId: batch.id,
            originalValue: ind.originalValue,
            normalizedValue: ind.normalizedValue,
            type: ind.type,
            status: ind.status,
            warning: ind.warning,
          },
          select: { id: true },
        })
      )
    );

    for (let i = 0; i < input.indicators.length; i++) {
      const ind = input.indicators[i];
      if (ind.status !== "parsed") continue;
      const plan = getEligibleProviderActions(ind, {
        selectedProviderIds: input.selectedProviderIds,
        mode: input.mode,
      });
      for (const step of plan) {
        if (step.action === "skip" || !step.providerId) continue;
        planned.push({
          indicatorId: indicatorRows[i].id,
          providerId: step.providerId,
          action: step.action,
          transport: step.transport,
        });
      }
    }

    if (planned.length) {
      await tx.providerAttempt.createMany({
        data: planned.map((p) => ({
          indicatorId: p.indicatorId,
          providerId: p.providerId,
          action: p.action,
          transport: p.transport,
          status: "pending",
        })),
      });
    }

    // createMany doesn't return rows; fetch IDs in stable order so we can map
    // back to the original plan (especially the per-attempt transport).
    const created = planned.length
      ? await tx.providerAttempt.findMany({
          where: {
            indicator: { batchId: batch.id },
            status: "pending",
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, transport: true },
        })
      : [];

    return { batch, attemptIds: created };
  });

  if (!planned.length) {
    // Nothing to dispatch — finalize the batch as completed immediately.
    await finalizeBatch(batch.id);
    return {
      batchId: batch.id,
      totalIndicators: input.indicators.length,
      totalAttempts: 0,
      queued: 0,
      syncCompleted: 0,
    };
  }

  const e = env();
  const useQueue = e.QUEUE_ENABLED && attemptIds.length >= e.QUEUE_BATCH_THRESHOLD;

  let queued = 0;
  let syncCompleted = 0;

  if (useQueue) {
    const queues = getQueues();
    await Promise.all(
      attemptIds.map(async (a) => {
        const target =
          a.transport === "playwright"
            ? queues.playwrightSubmissions
            : queues.submissionAttempts;
        await target.add(QUEUE_NAMES.submissionAttempts, {
          attemptId: a.id,
          batchId: batch.id,
        });
        queued++;
      })
    );
    log.info("batch queued", { batchId: batch.id, queued });
  } else {
    for (const a of attemptIds) {
      await processProviderAttempt(a.id, {
        allowPlaywright: a.transport === "playwright",
      });
      syncCompleted++;
    }
    await finalizeBatch(batch.id);
    log.info("batch processed inline", { batchId: batch.id, syncCompleted });
  }

  return {
    batchId: batch.id,
    totalIndicators: input.indicators.length,
    totalAttempts: attemptIds.length,
    queued,
    syncCompleted,
  };
}

/**
 * Recompute aggregate counts on the batch row. Called both from inline
 * dispatch and from the queue worker once each attempt completes.
 */
export async function finalizeBatch(batchId: string): Promise<void> {
  const groups = await prisma.providerAttempt.groupBy({
    by: ["status"],
    where: { indicator: { batchId } },
    _count: { _all: true },
  });

  let submitted = 0;
  let failed = 0;
  let skipped = 0;
  let pending = 0;
  for (const g of groups) {
    const n = g._count._all;
    switch (g.status) {
      case "success":
        submitted += n;
        break;
      case "failed":
      case "rate_limited":
        failed += n;
        break;
      case "skipped":
      case "unsupported":
      case "disabled":
      case "manual_required":
        skipped += n;
        break;
      case "pending":
        pending += n;
        break;
      default:
        break;
    }
  }

  const status = pending > 0 ? "processing" : "completed";

  await prisma.submissionBatch.update({
    where: { id: batchId },
    data: {
      submittedCount: submitted,
      failedCount: failed,
      skippedCount: skipped,
      status,
    },
  });
}

/**
 * Finalize only if no attempts on the batch are still pending. Cheap enough
 * to call from every worker completion — the underlying query is indexed on
 * `indicator.batchId` and `attempt.status`.
 */
export async function finalizeBatchIfDone(batchId: string): Promise<void> {
  const pending = await prisma.providerAttempt.count({
    where: { indicator: { batchId }, status: "pending" },
  });
  if (pending > 0) {
    // Still update the counters so the UI sees progress.
    await refreshBatchCounters(batchId);
    return;
  }
  await finalizeBatch(batchId);
}

async function refreshBatchCounters(batchId: string): Promise<void> {
  const groups = await prisma.providerAttempt.groupBy({
    by: ["status"],
    where: { indicator: { batchId } },
    _count: { _all: true },
  });
  const data: Prisma.SubmissionBatchUpdateInput = {
    submittedCount: groups.find((g) => g.status === "success")?._count._all ?? 0,
    failedCount:
      (groups.find((g) => g.status === "failed")?._count._all ?? 0) +
      (groups.find((g) => g.status === "rate_limited")?._count._all ?? 0),
    skippedCount: groups
      .filter((g) =>
        ["skipped", "unsupported", "disabled", "manual_required"].includes(g.status)
      )
      .reduce((acc, g) => acc + g._count._all, 0),
  };
  await prisma.submissionBatch.update({ where: { id: batchId }, data });
}

// Re-export for backwards-compat with existing callers.
export { getProvider };
