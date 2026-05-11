import { env } from "@/lib/env";
import { httpFetch, RateLimitedError, redact } from "@/lib/providers/http";
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
    `https://api.abuseipdb.com/api/v2/check` +
    `?ipAddress=${encodeURIComponent(input.indicator.normalizedValue)}` +
    `&maxAgeInDays=90&verbose`;

  try {
    const res = await httpFetch(url, {
      headers: {
        Accept: "application/json",
        Key: e.ABUSEIPDB_API_KEY,
      },
      rateLimitKey: ID,
      perMinute: e.ABUSEIPDB_RATE_LIMIT_PER_MINUTE,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok)
      return failed(ID, `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`, data);
    return success(ID, {
      raw: data,
      message: extractConfidence(data),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    return failed(ID, (err as Error).message);
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

  const categories =
    (input.extra?.categories as number[]) ?? // numeric per AbuseIPDB taxonomy
    [];
  if (!categories.length)
    return failed(ID, "AbuseIPDB report requires at least one category");

  const comment = input.comment;
  if (!comment) return failed(ID, "AbuseIPDB report requires a comment");

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run",
      raw: { categories, comment },
    });
  }

  const body = new URLSearchParams({
    ip: input.indicator.normalizedValue,
    categories: categories.join(","),
    comment,
  });

  const headers = {
    Accept: "application/json",
    Key: e.ABUSEIPDB_API_KEY,
  };

  try {
    const res = await httpFetch(`https://api.abuseipdb.com/api/v2/report`, {
      method: "POST",
      headers,
      body,
      rateLimitKey: ID,
      perMinute: e.ABUSEIPDB_RATE_LIMIT_PER_MINUTE,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok)
      return failed(ID, `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`, data);
    return success(ID, {
      raw: data,
      message: extractConfidence(data),
      redactedRequest: redact({ headers, body: body.toString() }, ["Key"]),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    return failed(ID, (err as Error).message);
  }
}

function extractConfidence(data: unknown): string | undefined {
  const d = (data as { data?: { abuseConfidenceScore?: number } })?.data;
  if (d?.abuseConfidenceScore !== undefined) {
    return `confidence=${d.abuseConfidenceScore}`;
  }
  return undefined;
}
