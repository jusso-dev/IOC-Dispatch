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
import { normalizeDomainToUrl } from "@/lib/indicators/normalize";

const ID = "urlscan";

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
  if (!e.URLSCAN_API_KEY) return disabled(ID, "URLSCAN_API_KEY missing");

  const url = toUrl(input);
  if (!url) return unsupported(ID, "urlscan accepts URLs or domains only");

  const visibility =
    (input.extra?.visibility as string) ?? e.URLSCAN_DEFAULT_VISIBILITY;

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run",
      raw: { url, visibility },
    });
  }

  const body = JSON.stringify({ url, visibility, tags: input.tags ?? [] });
  const headers = {
    "Content-Type": "application/json",
    "API-Key": e.URLSCAN_API_KEY,
  };
  try {
    const res = await httpFetch("https://urlscan.io/api/v1/scan/", {
      method: "POST",
      headers,
      body,
      rateLimitKey: ID,
      perMinute: e.URLSCAN_RATE_LIMIT_PER_MINUTE,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && (data.uuid || data.result)) {
      return success(ID, {
        externalId: typeof data.uuid === "string" ? data.uuid : undefined,
        externalUrl:
          typeof data.result === "string" ? data.result : undefined,
        raw: data,
        redactedRequest: redact({ headers, body }, ["API-Key"]),
      });
    }
    return failed(ID, `urlscan error: ${JSON.stringify(data).slice(0, 200)}`, data);
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    return failed(ID, (err as Error).message);
  }
}

export async function urlscanLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.URLSCAN_ENABLED) return disabled(ID, "URLSCAN_ENABLED=false");
  if (!e.URLSCAN_API_KEY) return disabled(ID, "URLSCAN_API_KEY missing");

  const url = toUrl(input);
  if (!url) return unsupported(ID, "urlscan accepts URLs or domains only");

  if (input.mode === "dry_run") {
    return success(ID, { message: "dry run", raw: { url } });
  }

  const q = encodeURIComponent(`page.url:"${url}"`);
  try {
    const res = await httpFetch(
      `https://urlscan.io/api/v1/search/?q=${q}&size=5`,
      {
        headers: { "API-Key": e.URLSCAN_API_KEY },
        rateLimitKey: ID,
        perMinute: e.URLSCAN_RATE_LIMIT_PER_MINUTE,
      }
    );
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return success(ID, { raw: data });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    return failed(ID, (err as Error).message);
  }
}
