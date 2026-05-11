import { Queue, type QueueOptions } from "bullmq";
import { getRedis } from "@/lib/redis";

export const QUEUE_NAMES = {
  submissionAttempts: "submission-attempts",
  providerHealthChecks: "provider-health-checks",
  playwrightSubmissions: "playwright-submissions",
} as const;

const baseOpts = (): QueueOptions => ({
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 500, age: 60 * 60 * 24 },
    removeOnFail: { count: 500, age: 60 * 60 * 24 },
  },
});

let queues: {
  submissionAttempts: Queue;
  providerHealthChecks: Queue;
  playwrightSubmissions: Queue;
} | null = null;

export function getQueues() {
  if (queues) return queues;
  queues = {
    submissionAttempts: new Queue(QUEUE_NAMES.submissionAttempts, baseOpts()),
    providerHealthChecks: new Queue(
      QUEUE_NAMES.providerHealthChecks,
      baseOpts()
    ),
    playwrightSubmissions: new Queue(
      QUEUE_NAMES.playwrightSubmissions,
      baseOpts()
    ),
  };
  return queues;
}

export interface SubmissionAttemptJobData {
  attemptId: string;
}

export interface PlaywrightJobData {
  attemptId: string;
}
