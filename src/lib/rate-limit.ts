import { randomUUID } from "node:crypto";
import { getRedis } from "@/lib/redis";
import { moduleLogger } from "@/lib/logger";

const log = moduleLogger("rate-limit");

/**
 * Sliding-window rate limiter on a Redis sorted set, evaluated atomically by
 * a Lua script. The check-and-add is a single round-trip so concurrent
 * requests against the same key cannot both pass when the budget is full.
 *
 *  KEYS[1] - sorted-set key
 *  ARGV[1] - window start (ms)
 *  ARGV[2] - now (ms)
 *  ARGV[3] - per-window budget
 *  ARGV[4] - sorted-set member (must be unique per call)
 *  ARGV[5] - key TTL (ms)
 */
const ACQUIRE_LUA = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[3]) then
  return 0
end
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[5])
return 1
`;

const WINDOW_MS = 60_000;
const TTL_MS = WINDOW_MS + 5_000;

/**
 * Attempts to consume one slot in the rolling 60-second window for `key`.
 * Returns true if the call is allowed, false if the budget is exhausted.
 * `perMinute <= 0` disables the limiter (always allowed).
 *
 * Failure modes: if Redis is unreachable we fail open and log a warning —
 * the local limiter is a safety net, not the authoritative provider quota,
 * so blocking legitimate traffic on infra hiccups is worse than letting it
 * through.
 */
export async function tryAcquire(
  key: string,
  perMinute: number
): Promise<boolean> {
  if (perMinute <= 0) return true;

  const r = getRedis();
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const member = `${now}:${randomUUID()}`;
  const rkey = `ratelimit:${key}`;

  try {
    const result = (await r.eval(
      ACQUIRE_LUA,
      1,
      rkey,
      String(windowStart),
      String(now),
      String(perMinute),
      member,
      String(TTL_MS)
    )) as number;
    return result === 1;
  } catch (err) {
    log.warn("redis eval failed; failing open", { key, err });
    return true;
  }
}
