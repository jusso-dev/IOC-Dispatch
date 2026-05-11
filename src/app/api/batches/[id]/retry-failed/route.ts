import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processProviderAttempt } from "@/server/submissions/process-provider-attempt";
import { getQueues, QUEUE_NAMES } from "@/server/queues/bullmq";
import { env } from "@/lib/env";
import { finalizeBatch } from "@/server/submissions/create-batch";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const failed = await prisma.providerAttempt.findMany({
    where: {
      indicator: { batchId: id },
      status: { in: ["failed", "rate_limited"] },
    },
    select: { id: true, transport: true },
  });
  if (!failed.length) return NextResponse.json({ retried: 0 });

  await prisma.providerAttempt.updateMany({
    where: { id: { in: failed.map((a) => a.id) } },
    data: {
      status: "pending",
      errorMessage: null,
      completedAt: null,
    },
  });

  const useQueue = env().QUEUE_ENABLED && failed.length >= 25;
  if (useQueue) {
    const { submissionAttempts, playwrightSubmissions } = getQueues();
    for (const a of failed) {
      const q =
        a.transport === "playwright" ? playwrightSubmissions : submissionAttempts;
      await q.add(QUEUE_NAMES.submissionAttempts, { attemptId: a.id });
    }
    return NextResponse.json({ retried: failed.length, mode: "queued" });
  }

  for (const a of failed) {
    await processProviderAttempt(a.id, {
      allowPlaywright: a.transport === "playwright",
    });
  }
  await finalizeBatch(id);
  return NextResponse.json({ retried: failed.length, mode: "sync" });
}
