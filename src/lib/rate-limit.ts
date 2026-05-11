import { getRedis } from "@/lib/redis";

/**
 * Simple rolling-window rate limiter using a Redis sorted set.
 * Returns true if the call is allowed, false if it would exceed the per-minute budget.
 */
export async function tryAcquire(
  key: string,
  perMinute: number
): Promise<boolean> {
  if (perMinute <= 0) return true;
  const r = getRedis();
  const now = Date.now();
  const windowStart = now - 60_000;
  const rkey = `ratelimit:${key}`;
  const pipeline = r.multi();
  pipeline.zremrangebyscore(rkey, 0, windowStart);
  pipeline.zcard(rkey);
  const results = await pipeline.exec();
  const count = (results?.[1]?.[1] as number) ?? 0;
  if (count >= perMinute) return false;
  await r
    .multi()
    .zadd(rkey, now, `${now}-${Math.random()}`)
    .pexpire(rkey, 65_000)
    .exec();
  return true;
}
