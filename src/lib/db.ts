import { PrismaClient } from "@prisma/client";
import { moduleLogger } from "@/lib/logger";

const log = moduleLogger("prisma");

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const verbose = process.env.NODE_ENV !== "production";
  return new PrismaClient({
    log: verbose ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

/**
 * Graceful disconnect. Safe to call from signal handlers and during HMR
 * teardown — repeated calls are harmless.
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err) {
    log.warn("disconnect error", { err });
  }
}
