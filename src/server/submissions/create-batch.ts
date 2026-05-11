import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { ParsedIndicator } from "@/lib/indicators/types";
import type { SubmissionMode } from "@/lib/providers/types";
import { getEligibleProviderActions } from "./routing";
import { processProviderAttempt } from "./process-provider-attempt";
import { getProvider } from "@/lib/providers/registry";
import { getQueues, QUEUE_NAMES } from "@/server/queues/bullmq";

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
  queued: number;
  syncCompleted: number;
}

export async function createSubmissionBatch(
  input: CreateBatchInput
): Promise<CreatedBatchSummary> {
  const batch = await prisma.submissionBatch.create({
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

  // Build all indicators + plan their provider attempts.
  type PlannedAttempt = {
    indicatorId: string;
    providerId: string;
    action: string;
    transport: string;
    reason: string;
  };
  const plannedAttempts: PlannedAttempt[] = [];

  for (const ind of input.indicators) {
    const created = await prisma.submissionIndicator.create({
      data: {
        batchId: batch.id,
        originalValue: ind.originalValue,
        normalizedValue: ind.normalizedValue,
        type: ind.type,
        status: ind.status,
        warning: ind.warning,
      },
    });

    if (ind.status !== "parsed") continue;

    const plan = getEligibleProviderActions(ind, {
      selectedProviderIds: input.selectedProviderIds,
      mode: input.mode,
    });

    for (const step of plan) {
      if (step.action === "skip" || !step.providerId) continue;
      plannedAttempts.push({
        indicatorId: created.id,
        providerId: step.providerId,
        action: step.action,
        transport: step.transport,
        reason: step.reason,
      });
    }
  }

  // Materialize attempts as pending rows.
  const attemptRows = await Promise.all(
    plannedAttempts.map((p) =>
      prisma.providerAttempt.create({
        data: {
          indicatorId: p.indicatorId,
          providerId: p.providerId,
          action: p.action,
          transport: p.transport,
          status: "pending",
        },
        select: { id: true, transport: true, providerId: true },
      })
    )
  );

  const e = env();
  const useQueue =
    e.QUEUE_ENABLED && attemptRows.length >= e.QUEUE_BATCH_THRESHOLD;

  let queued = 0;
  let syncCompleted = 0;

  if (useQueue) {
    const { submissionAttempts, playwrightSubmissions } = getQueues();
    for (const a of attemptRows) {
      const targetQueue =
        a.transport === "playwright" ? playwrightSubmissions : submissionAttempts;
      await targetQueue.add(QUEUE_NAMES.submissionAttempts, { attemptId: a.id });
      queued++;
    }
  } else {
    for (const a of attemptRows) {
      await processProviderAttempt(a.id, {
        allowPlaywright: a.transport === "playwright",
      });
      syncCompleted++;
    }
    await finalizeBatch(batch.id);
  }

  return { batchId: batch.id, queued, syncCompleted };
}

export async function finalizeBatch(batchId: string) {
  const attempts = await prisma.providerAttempt.findMany({
    where: { indicator: { batchId } },
    select: { status: true },
  });
  const submitted = attempts.filter((a) => a.status === "success").length;
  const failed = attempts.filter((a) =>
    ["failed", "rate_limited"].includes(a.status)
  ).length;
  const skipped = attempts.filter((a) =>
    ["skipped", "unsupported", "disabled", "manual_required"].includes(a.status)
  ).length;

  await prisma.submissionBatch.update({
    where: { id: batchId },
    data: {
      submittedCount: submitted,
      failedCount: failed,
      skippedCount: skipped,
      status: "completed",
    },
  });
}

// re-export so registry stays decoupled if anyone needs to inspect provider list
export { getProvider };
