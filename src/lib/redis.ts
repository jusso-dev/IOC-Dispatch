import IORedis, { type Redis, type RedisOptions } from "ioredis";
import { env } from "@/lib/env";
import { moduleLogger } from "@/lib/logger";

const log = moduleLogger("redis");

let appClient: Redis | null = null;
let bullClient: Redis | null = null;

function attach(name: string, client: Redis): Redis {
  client.on("error", (err) => {
    log.warn(`${name} connection error`, { err });
  });
  client.on("end", () => {
    log.info(`${name} connection closed`);
  });
  client.on("reconnecting", (ms: number) => {
    log.debug(`${name} reconnecting`, { delayMs: ms });
  });
  return client;
}

/**
 * Application-level Redis client. Tuned for short-lived operations like the
 * rate limiter and cache reads, with bounded retries so a stalled connection
 * surfaces as an error rather than hanging callers.
 */
export function getRedis(): Redis {
  if (appClient) return appClient;
  const opts: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 5_000,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2_000),
  };
  appClient = attach("app", new IORedis(env().REDIS_URL, opts));
  return appClient;
}

/**
 * Dedicated connection for BullMQ. BullMQ requires `maxRetriesPerRequest: null`
 * and `enableReadyCheck: false` on the client passed to its Queue/Worker
 * constructors — sharing the app client would either break those guarantees
 * or break our bounded-retry app traffic.
 */
export function getBullConnection(): Redis {
  if (bullClient) return bullClient;
  const opts: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
  };
  bullClient = attach("bullmq", new IORedis(env().REDIS_URL, opts));
  return bullClient;
}

export async function redisHealth(): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = getRedis();
    const pong = await r.ping();
    return { ok: pong === "PONG" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function closeRedis(): Promise<void> {
  const closers: Array<Promise<unknown>> = [];
  if (appClient) closers.push(appClient.quit().catch(() => undefined));
  if (bullClient) closers.push(bullClient.quit().catch(() => undefined));
  appClient = null;
  bullClient = null;
  await Promise.allSettled(closers);
}
