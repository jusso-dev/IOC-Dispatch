import { moduleLogger } from "@/lib/logger";
import { closeRedis } from "@/lib/redis";
import { disconnectPrisma } from "@/lib/db";
import { closeQueues } from "./bullmq";
import { startWorkers, stopWorkers, type WorkerBundle } from "./workers";

const log = moduleLogger("worker-entry");
const SHUTDOWN_TIMEOUT_MS = 30_000;

log.info("starting IntelRelay workers");

const bundle: WorkerBundle = startWorkers();

let shuttingDown = false;

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info("shutting down", { reason });

  const timer = setTimeout(() => {
    log.error("graceful shutdown timed out — forcing exit");
    process.exit(exitCode || 1);
  }, SHUTDOWN_TIMEOUT_MS);
  timer.unref();

  try {
    await stopWorkers(bundle);
    await closeQueues();
    await disconnectPrisma();
    await closeRedis();
  } catch (err) {
    log.error("error during shutdown", { err });
    exitCode = exitCode || 1;
  } finally {
    clearTimeout(timer);
    process.exit(exitCode);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  log.error("uncaughtException", { err });
  void shutdown("uncaughtException", 1);
});
process.on("unhandledRejection", (reason) => {
  log.error("unhandledRejection", { reason });
  void shutdown("unhandledRejection", 1);
});
