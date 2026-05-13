import { env } from "@/lib/env";
import { tryAcquire } from "@/lib/rate-limit";

const DEFAULT_USER_AGENT =
  "IntelRelay/0.1 (+https://github.com/jusso-dev/ioc-dispatch)";

export interface HttpFetchOpts extends RequestInit {
  timeoutMs?: number;
  rateLimitKey?: string;
  perMinute?: number;
}

export class RateLimitedError extends Error {
  constructor(public readonly providerId: string) {
    super(`local rate limit exceeded for ${providerId}`);
    this.name = "RateLimitedError";
  }
}

export class HttpTimeoutError extends Error {
  constructor(public readonly url: string, public readonly timeoutMs: number) {
    super(`HTTP request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "HttpTimeoutError";
  }
}

function mergeHeaders(init: HeadersInit | undefined): Headers {
  const h = new Headers(init ?? undefined);
  if (!h.has("user-agent")) h.set("user-agent", DEFAULT_USER_AGENT);
  if (!h.has("accept")) h.set("accept", "application/json, */*;q=0.1");
  return h;
}

/**
 * fetch() with a hard deadline, default headers, and an optional local rate
 * limiter check. Throws `RateLimitedError` (local) or `HttpTimeoutError`
 * (timeout); transport errors propagate unchanged.
 */
export async function httpFetch(
  url: string,
  opts: HttpFetchOpts = {}
): Promise<Response> {
  const { timeoutMs, rateLimitKey, perMinute, headers, ...init } = opts;
  const effectiveTimeout = timeoutMs ?? env().HTTP_TIMEOUT_MS;

  if (rateLimitKey && perMinute && perMinute > 0) {
    const ok = await tryAcquire(rateLimitKey, perMinute);
    if (!ok) throw new RateLimitedError(rateLimitKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    return await fetch(url, {
      ...init,
      headers: mergeHeaders(headers),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpTimeoutError(url, effectiveTimeout);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Header names + query-param keys + JSON keys that must never reach storage.
const ALWAYS_REDACT = new Set([
  "authorization",
  "auth-key",
  "x-api-key",
  "x-apikey",
  "api-key",
  "apikey",
  "key",
  "client_secret",
  "client-secret",
  "password",
  "app_key",
  "appkey",
  "token",
  "access_token",
  "refresh_token",
  "bearer",
]);

const REDACTED = "[REDACTED]";

/**
 * Recursively redacts known secret-bearing keys in a payload. Header objects
 * are matched case-insensitively. Strings that look like Bearer tokens are
 * replaced wholesale, even when the surrounding key isn't on the list.
 */
export function redact<T>(input: T, extraKeys: string[] = []): T {
  const denylist = new Set([
    ...ALWAYS_REDACT,
    ...extraKeys.map((k) => k.toLowerCase()),
  ]);
  return redactValue(input, denylist) as T;
}

function redactValue(value: unknown, denylist: Set<string>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (/^Bearer\s+\S+/i.test(value)) return REDACTED;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, denylist));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (denylist.has(k.toLowerCase())) {
        out[k] = REDACTED;
      } else {
        out[k] = redactValue(v, denylist);
      }
    }
    return out;
  }
  return value;
}

export interface DecodedResponse {
  ok: boolean;
  status: number;
  contentType: string;
  json: Record<string, unknown> | null;
  text: string;
  /** Always-inspectable body: JSON when we have it, otherwise wrapped text. */
  body: Record<string, unknown>;
}

/**
 * Decode a fetch Response into something always inspectable. If the body
 * parses as JSON we return it. If not, we keep the raw text under
 * `responseText` so the UI never displays an empty `{}`.
 */
export async function decodeResponse(res: Response): Promise<DecodedResponse> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text().catch(() => "");
  let json: Record<string, unknown> | null = null;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        json = parsed as Record<string, unknown>;
      } else if (Array.isArray(parsed)) {
        json = { data: parsed };
      }
    } catch {
      // not JSON — fall through and keep raw text
    }
  }
  const body: Record<string, unknown> = json ?? {
    httpStatus: res.status,
    contentType,
    responseText: text.slice(0, 4000),
  };
  return { ok: res.ok, status: res.status, contentType, json, text, body };
}

/**
 * Pulls a human-friendly error message out of a decoded response body.
 * Looks at common shapes (`error`, `message`, `errors[0]`, RFC-7807 `detail`).
 */
export function describeHttpError(decoded: DecodedResponse): string {
  const b = decoded.body;
  const candidates = [
    b.message,
    b.error,
    b.detail,
    b.error_description,
    Array.isArray(b.errors) && b.errors.length
      ? ((b.errors as unknown[])[0] as { message?: string })?.message
      : undefined,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 240);
  }
  const text = (b.responseText as string | undefined) ?? "";
  if (text) return text.slice(0, 240);
  return `HTTP ${decoded.status}`;
}
