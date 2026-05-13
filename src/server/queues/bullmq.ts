import { Queue, type QueueOptions } from "bullmq";
import { env } from "@/lib/env";
import { getBullConnection } from "@/lib/redis";

export const QUEUE_NAMES = {
  submissionAttempts: "submission-attempts",
  providerHealthChecks: "provider-health-checks",
  playwrightSubmissions: "playwright-submissions",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

function baseOpts(): QueueOptions {
  return {
    connection: getBullConnection(),
    defaultJobOptions: {
      attempts: env().QUEUE_JOB_ATTEMPTS,
      // Exponential backoff: 5s, 25s, 125s ... capped by BullMQ at the
      // requested attempt count. Transient provider 5xxs and dropped TCP
      // connections regularly recover within a minute.
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 500, age: 60 * 60 * 24 },
      removeOnFail: { count: 1_000, age: 60 * 60 * 24 * 7 },
    },
  };
}

interface QueueBundle {
  submissionAttempts: Queue;
  providerHealthChecks: Queue;
  playwrightSubmissions: Queue;
}

let queues: QueueBundle | null = null;

export function getQueues(): QueueBundle {
  if (queues) return queues;
  queues = {
    submissionAttempts: new Queue(QUEUE_NAMES.submissionAttempts, baseOpts()),
    providerHealthChecks: new Queue(QUEUE_NAMES.providerHealthChecks, baseOpts()),
    playwrightSubmissions: new Queue(QUEUE_NAMES.playwrightSubmissions, baseOpts()),
  };
  return queues;
}

export async function closeQueues(): Promise<void> {
  if (!queues) return;
  const pending = [
    queues.submissionAttempts.close(),
    queues.providerHealthChecks.close(),
    queues.playwrightSubmissions.close(),
  ];
  queues = null;
  await Promise.allSettled(pending);
}

export interface SubmissionAttemptJobData {
  attemptId: string;
  batchId: string;
}

export interface PlaywrightJobData {
  attemptId: string;
  batchId: string;
}
