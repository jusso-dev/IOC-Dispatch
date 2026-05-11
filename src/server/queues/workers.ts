import { Worker, type WorkerOptions } from "bullmq";
import { getRedis } from "@/lib/redis";
import {
  QUEUE_NAMES,
  type SubmissionAttemptJobData,
  type PlaywrightJobData,
} from "./bullmq";
import { processProviderAttempt } from "@/server/submissions/process-provider-attempt";

const baseOpts = (): WorkerOptions => ({
  connection: getRedis(),
  concurrency: 4,
});

export function startWorkers() {
  const submissionWorker = new Worker<SubmissionAttemptJobData>(
    QUEUE_NAMES.submissionAttempts,
    async (job) => {
      await processProviderAttempt(job.data.attemptId, { allowPlaywright: false });
    },
    baseOpts()
  );

  const playwrightWorker = new Worker<PlaywrightJobData>(
    QUEUE_NAMES.playwrightSubmissions,
    async (job) => {
      await processProviderAttempt(job.data.attemptId, { allowPlaywright: true });
    },
    { ...baseOpts(), concurrency: 1 }
  );

  const healthWorker = new Worker(
    QUEUE_NAMES.providerHealthChecks,
    async () => {
      // Reserved for periodic provider health probing.
      return { ok: true };
    },
    baseOpts()
  );

  for (const w of [submissionWorker, playwrightWorker, healthWorker]) {
    w.on("failed", (job, err) => {
      console.error(`[worker] job ${job?.id} failed:`, err.message);
    });
  }

  return { submissionWorker, playwrightWorker, healthWorker };
}
