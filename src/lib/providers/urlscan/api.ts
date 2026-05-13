import { env } from "@/lib/env";
import {
  decodeResponse,
  describeHttpError,
  httpFetch,
  HttpTimeoutError,
  RateLimitedError,
  redact,
} from "@/lib/providers/http";
import {
  disabled,
  failed,
  rateLimited,
  success,
  unsupported,
} from "@/lib/providers/result";
import type {
  ProviderSubmissionInput,
  ProviderSubmissionResult,
} from "@/lib/providers/types";
import { normalizeDomainToUrl } from "@/lib/indicators/normalize";

const ID = "urlscan";
const BASE = "https://urlscan.io/api/v1";

function toUrl(input: ProviderSubmissionInput): string | null {
  if (input.indicator.type === "url") return input.indicator.normalizedValue;
  if (input.indicator.type === "domain") {
    try {
      return normalizeDomainToUrl(input.indicator.normalizedValue);
    } catch {
      return null;
    }
  }
  return null;
}

export async function urlscanScan(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.URLSCAN_ENABLED) return disabled(ID, "URLSCAN_ENABLED=false");
  if (!e.URLSCAN_API_KEY) return disabled(ID, "Missing URLSCAN_API_KEY");

  const url = toUrl(input);
  if (!url) return unsupported(ID, "urlscan accepts URLs or domains only");

  const visibility =
    (input.extra?.visibility as string) ?? e.URLSCAN_DEFAULT_VISIBILITY;

  if (input.mode === "dry_run") {
    return success(ID, { message: "dry run", raw: { url, visibility } });
  }

  const body = JSON.stringify({ url, visibility, tags: input.tags ?? [] });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "API-Key": e.URLSCAN_API_KEY,
  };

  try {
    const res = await httpFetch(`${BASE}/scan/`, {
      method: "POST",
      headers,
      body,
      rateLimitKey: ID,
      perMinute: e.URLSCAN_RATE_LIMIT_PER_MINUTE,
    });
    const decoded = await decodeResponse(res);
    if (res.status === 429) {
      return rateLimited(ID, "remote", describeHttpError(decoded));
    }
    if (!res.ok || !(decoded.body.uuid || decoded.body.result)) {
      return failed(
        ID,
        `HTTP ${res.status}: ${describeHttpError(decoded)}`,
        decoded.body
      );
    }
    return success(ID, {
      externalId:
        typeof decoded.body.uuid === "string"
          ? (decoded.body.uuid as string)
          : undefined,
      externalUrl:
        typeof decoded.body.result === "string"
          ? (decoded.body.result as string)
          : undefined,
      raw: decoded.body,
      message: `scan queued (${visibility})`,
      redactedRequest: redact({ headers, body }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

export async function urlscanLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.URLSCAN_ENABLED) return disabled(ID, "URLSCAN_ENABLED=false");
  if (!e.URLSCAN_API_KEY) return disabled(ID, "Missing URLSCAN_API_KEY");

  const url = toUrl(input);
  if (!url) return unsupported(ID, "urlscan accepts URLs or domains only");

  if (input.mode === "dry_run") {
    return success(ID, { message: "dry run", raw: { url } });
  }

  const q = encodeURIComponent(`page.url:"${url}"`);
  const headers: Record<string, string> = { "API-Key": e.URLSCAN_API_KEY };
  try {
    const res = await httpFetch(`${BASE}/search/?q=${q}&size=5`, {
      headers,
      rateLimitKey: ID,
      perMinute: e.URLSCAN_RATE_LIMIT_PER_MINUTE,
    });
    const decoded = await decodeResponse(res);
    if (res.status === 429) {
      return rateLimited(ID, "remote", describeHttpError(decoded));
    }
    if (!res.ok) {
      return failed(
        ID,
        `HTTP ${res.status}: ${describeHttpError(decoded)}`,
        decoded.body
      );
    }
    return success(ID, {
      raw: decoded.body,
      redactedRequest: redact({ headers }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}
