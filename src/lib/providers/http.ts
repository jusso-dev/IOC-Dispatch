import { tryAcquire } from "@/lib/rate-limit";

export interface HttpFetchOpts extends RequestInit {
  timeoutMs?: number;
  rateLimitKey?: string;
  perMinute?: number;
}

export class RateLimitedError extends Error {
  constructor(public providerId: string) {
    super(`rate limited: ${providerId}`);
    this.name = "RateLimitedError";
  }
}

export async function httpFetch(
  url: string,
  opts: HttpFetchOpts = {}
): Promise<Response> {
  const { timeoutMs = 15_000, rateLimitKey, perMinute, ...init } = opts;

  if (rateLimitKey && perMinute) {
    const ok = await tryAcquire(rateLimitKey, perMinute);
    if (!ok) throw new RateLimitedError(rateLimitKey);
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export function redact<T extends Record<string, unknown>>(
  input: T,
  keys: string[]
): T {
  const out = { ...input } as Record<string, unknown>;
  for (const k of keys) {
    if (k in out) out[k] = "[REDACTED]";
  }
  return out as T;
}

export interface DecodedResponse {
  ok: boolean;
  status: number;
  contentType: string;
  json: Record<string, unknown> | null;
  text: string;
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
      if (parsed && typeof parsed === "object") {
        json = parsed as Record<string, unknown>;
      }
    } catch {
      // not JSON — keep text only
    }
  }
  const body: Record<string, unknown> = json ?? {
    httpStatus: res.status,
    contentType,
    responseText: text.slice(0, 4000),
  };
  return { ok: res.ok, status: res.status, contentType, json, text, body };
}
