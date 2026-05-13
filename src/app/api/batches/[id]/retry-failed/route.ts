import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, assertValidId, withErrorHandling } from "@/lib/api/handler";
import { getQueues, QUEUE_NAMES } from "@/server/queues/bullmq";
import {
  finalizeBatch,
  finalizeBatchIfDone,
} from "@/server/submissions/create-batch";
import { processProviderAttempt } from "@/server/submissions/process-provider-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export const POST = withErrorHandling(
  "POST /api/batches/[id]/retry-failed",
  async (_req: Request, ctx: RouteCtx) => {
    const { id } = await ctx.params;
    if (!assertValidId(id)) return apiError("invalid batch id", 400);

    const batch = await prisma.submissionBatch.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!batch) return apiError("batch not found", 404);

    const failed = await prisma.providerAttempt.findMany({
      where: {
        indicator: { batchId: id },
        status: { in: ["failed", "rate_limited"] },
      },
      select: { id: true, transport: true },
    });
    if (!failed.length) {
      return NextResponse.json({ retried: 0, mode: "none" });
    }

    await prisma.providerAttempt.updateMany({
      where: { id: { in: failed.map((a) => a.id) } },
      data: { status: "pending", errorMessage: null, completedAt: null },
    });
    // Reflect the pending state on the batch so the UI shows progress.
    await prisma.submissionBatch.update({
      where: { id },
      data: { status: "processing" },
    });

    const e = env();
    const useQueue = e.QUEUE_ENABLED && failed.length >= e.QUEUE_BATCH_THRESHOLD;

    if (useQueue) {
      const queues = getQueues();
      await Promise.all(
        failed.map(async (a) => {
          const target =
            a.transport === "playwright"
              ? queues.playwrightSubmissions
              : queues.submissionAttempts;
          await target.add(QUEUE_NAMES.submissionAttempts, {
            attemptId: a.id,
            batchId: id,
          });
        })
      );
      return NextResponse.json({ retried: failed.length, mode: "queued" });
    }

    for (const a of failed) {
      await processProviderAttempt(a.id, {
        allowPlaywright: a.transport === "playwright",
        force: true,
      });
    }
    await finalizeBatch(id);
    await finalizeBatchIfDone(id);
    return NextResponse.json({ retried: failed.length, mode: "sync" });
  }
);
