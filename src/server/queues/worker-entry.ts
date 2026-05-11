import { startWorkers } from "./workers";

console.log("[worker] starting IntelRelay workers…");
const workers = startWorkers();

process.on("SIGINT", async () => {
  console.log("[worker] SIGINT — shutting down");
  await Promise.allSettled([
    workers.submissionWorker.close(),
    workers.playwrightWorker.close(),
    workers.healthWorker.close(),
  ]);
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM — shutting down");
  await Promise.allSettled([
    workers.submissionWorker.close(),
    workers.playwrightWorker.close(),
    workers.healthWorker.close(),
  ]);
  process.exit(0);
});
