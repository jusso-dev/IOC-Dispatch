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

const ID = "abuseipdb";
const BASE = "https://api.abuseipdb.com/api/v2";

export async function abuseipdbLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.ABUSEIPDB_ENABLED) return disabled(ID, "ABUSEIPDB_ENABLED=false");
  if (!e.ABUSEIPDB_API_KEY) return disabled(ID, "Missing ABUSEIPDB_API_KEY");
  if (input.indicator.type !== "ipv4")
    return unsupported(ID, "AbuseIPDB accepts IPv4 only");

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  const url =
    `${BASE}/check` +
    `?ipAddress=${encodeURIComponent(input.indicator.normalizedValue)}` +
    `&maxAgeInDays=90&verbose`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    Key: e.ABUSEIPDB_API_KEY,
  };

  try {
    const res = await httpFetch(url, {
      headers,
      rateLimitKey: ID,
      perMinute: e.ABUSEIPDB_RATE_LIMIT_PER_MINUTE,
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
      message: extractConfidence(decoded.body),
      redactedRequest: redact({ url, headers }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

export async function abuseipdbReport(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.ABUSEIPDB_ENABLED) return disabled(ID, "ABUSEIPDB_ENABLED=false");
  if (!e.ABUSEIPDB_API_KEY) return disabled(ID, "Missing ABUSEIPDB_API_KEY");
  if (input.indicator.type !== "ipv4")
    return unsupported(ID, "AbuseIPDB accepts IPv4 only");

  const categories = (input.extra?.categories as number[]) ?? [];
  if (!categories.length) {
    return failed(ID, "AbuseIPDB report requires at least one category");
  }
  const comment = input.comment;
  if (!comment) return failed(ID, "AbuseIPDB report requires a comment");

  if (input.mode === "dry_run") {
    return success(ID, { message: "dry run", raw: { categories, comment } });
  }

  const body = new URLSearchParams({
    ip: input.indicator.normalizedValue,
    categories: categories.join(","),
    comment,
  });
  const headers: Record<string, string> = {
    Accept: "application/json",
    Key: e.ABUSEIPDB_API_KEY,
  };

  try {
    const res = await httpFetch(`${BASE}/report`, {
      method: "POST",
      headers,
      body,
      rateLimitKey: ID,
      perMinute: e.ABUSEIPDB_RATE_LIMIT_PER_MINUTE,
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
      message: extractConfidence(decoded.body),
      redactedRequest: redact({ headers, body: body.toString() }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

function extractConfidence(data: unknown): string | undefined {
  const d = (data as { data?: { abuseConfidenceScore?: number } })?.data;
  if (d?.abuseConfidenceScore !== undefined) {
    return `confidence=${d.abuseConfidenceScore}`;
  }
  return undefined;
}
