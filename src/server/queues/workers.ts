import { Worker, type WorkerOptions } from "bullmq";
import { getBullConnection } from "@/lib/redis";
import { moduleLogger } from "@/lib/logger";
import {
  QUEUE_NAMES,
  type PlaywrightJobData,
  type SubmissionAttemptJobData,
} from "./bullmq";
import { finalizeBatchIfDone } from "@/server/submissions/create-batch";
import { processProviderAttempt } from "@/server/submissions/process-provider-attempt";

const log = moduleLogger("worker");

function baseOpts(): WorkerOptions {
  return {
    connection: getBullConnection(),
    concurrency: 4,
  };
}

export interface WorkerBundle {
  submissionWorker: Worker<SubmissionAttemptJobData>;
  playwrightWorker: Worker<PlaywrightJobData>;
  healthWorker: Worker;
}

function attachLifecycleLogs(name: string, worker: Worker): void {
  worker.on("completed", (job) => {
    log.debug(`${name} job complete`, { jobId: job.id });
  });
  worker.on("failed", (job, err) => {
    log.error(`${name} job failed`, {
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      data: job?.data,
      err,
    });
  });
  worker.on("error", (err) => {
    log.error(`${name} worker error`, { err });
  });
  worker.on("stalled", (jobId) => {
    log.warn(`${name} stalled`, { jobId });
  });
}

export function startWorkers(): WorkerBundle {
  const submissionWorker = new Worker<SubmissionAttemptJobData>(
    QUEUE_NAMES.submissionAttempts,
    async (job) => {
      await processProviderAttempt(job.data.attemptId, { allowPlaywright: false });
      await finalizeBatchIfDone(job.data.batchId);
    },
    baseOpts()
  );

  const playwrightWorker = new Worker<PlaywrightJobData>(
    QUEUE_NAMES.playwrightSubmissions,
    async (job) => {
      await processProviderAttempt(job.data.attemptId, { allowPlaywright: true });
      await finalizeBatchIfDone(job.data.batchId);
    },
    // Playwright runs are heavy and stateful; cap concurrency to a single
    // browser context per worker process.
    { ...baseOpts(), concurrency: 1 }
  );

  const healthWorker = new Worker(
    QUEUE_NAMES.providerHealthChecks,
    async () => ({ ok: true }),
    baseOpts()
  );

  attachLifecycleLogs("submission", submissionWorker);
  attachLifecycleLogs("playwright", playwrightWorker);
  attachLifecycleLogs("health", healthWorker);

  return { submissionWorker, playwrightWorker, healthWorker };
}

export async function stopWorkers(bundle: WorkerBundle): Promise<void> {
  await Promise.allSettled([
    bundle.submissionWorker.close(),
    bundle.playwrightWorker.close(),
    bundle.healthWorker.close(),
  ]);
}
