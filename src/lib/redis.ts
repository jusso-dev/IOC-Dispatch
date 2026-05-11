import IORedis, { type Redis, type RedisOptions } from "ioredis";
import { env } from "@/lib/env";

let cached: Redis | null = null;

export function getRedis(opts: RedisOptions = {}): Redis {
  if (cached) return cached;
  const url = env().REDIS_URL;
  cached = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...opts,
  });
  cached.on("error", (err) => {
    console.warn("[redis] error", err.message);
  });
  return cached;
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
