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

const ID = "virustotal";
const BASE = "https://www.virustotal.com/api/v3";

function endpointForLookup(input: ProviderSubmissionInput): string | null {
  const v = input.indicator.normalizedValue;
  switch (input.indicator.type) {
    case "url": {
      // VT identifies URLs by base64url of the URL itself, no padding.
      const id = Buffer.from(v)
        .toString("base64")
        .replace(/=+$/, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      return `${BASE}/urls/${id}`;
    }
    case "domain":
      return `${BASE}/domains/${encodeURIComponent(v)}`;
    case "ipv4":
      return `${BASE}/ip_addresses/${encodeURIComponent(v)}`;
    case "md5":
    case "sha1":
    case "sha256":
      return `${BASE}/files/${v}`;
    default:
      return null;
  }
}

export async function vtLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.VIRUSTOTAL_ENABLED) return disabled(ID, "VIRUSTOTAL_ENABLED=false");
  if (!e.VIRUSTOTAL_API_KEY) return disabled(ID, "Missing VIRUSTOTAL_API_KEY");

  const url = endpointForLookup(input);
  if (!url) return unsupported(ID, `VT cannot lookup ${input.indicator.type}`);

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  const headers: Record<string, string> = { "x-apikey": e.VIRUSTOTAL_API_KEY };

  try {
    const res = await httpFetch(url, {
      headers,
      rateLimitKey: ID,
      perMinute: e.VIRUSTOTAL_RATE_LIMIT_PER_MINUTE,
    });
    const decoded = await decodeResponse(res);

    if (res.status === 404) {
      return success(ID, {
        message: "not in VT corpus",
        raw: decoded.body,
        redactedRequest: redact({ url, headers }),
      });
    }
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
      message: vtStats(decoded.body),
      externalUrl: vtPermalink(input),
      redactedRequest: redact({ url, headers }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

export async function vtScan(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.VIRUSTOTAL_ENABLED) return disabled(ID, "VIRUSTOTAL_ENABLED=false");
  if (!e.VIRUSTOTAL_API_KEY) return disabled(ID, "Missing VIRUSTOTAL_API_KEY");
  if (!e.VIRUSTOTAL_ALLOW_ACTIVE_URL_SCAN)
    return disabled(ID, "VIRUSTOTAL_ALLOW_ACTIVE_URL_SCAN=false");
  if (input.indicator.type !== "url")
    return unsupported(ID, "VT active scan supports URL only");

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  const body = new URLSearchParams({ url: input.indicator.normalizedValue });
  const headers: Record<string, string> = { "x-apikey": e.VIRUSTOTAL_API_KEY };

  try {
    const res = await httpFetch(`${BASE}/urls`, {
      method: "POST",
      headers,
      body,
      rateLimitKey: ID,
      perMinute: e.VIRUSTOTAL_RATE_LIMIT_PER_MINUTE,
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
      message: "submitted for scan",
      redactedRequest: redact({ headers, body: body.toString() }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

function vtPermalink(input: ProviderSubmissionInput): string | undefined {
  const v = input.indicator.normalizedValue;
  switch (input.indicator.type) {
    case "url":
      return `https://www.virustotal.com/gui/url/${Buffer.from(v).toString("hex")}`;
    case "domain":
      return `https://www.virustotal.com/gui/domain/${encodeURIComponent(v)}`;
    case "ipv4":
      return `https://www.virustotal.com/gui/ip-address/${encodeURIComponent(v)}`;
    case "md5":
    case "sha1":
    case "sha256":
      return `https://www.virustotal.com/gui/file/${v}`;
    default:
      return undefined;
  }
}

function vtStats(data: unknown): string | undefined {
  const attributes = (data as {
    data?: {
      attributes?: {
        last_analysis_stats?: Record<string, number>;
        reputation?: number;
      };
    };
  })?.data?.attributes;
  if (!attributes?.last_analysis_stats) return undefined;
  const s = attributes.last_analysis_stats;
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  return `malicious=${s.malicious ?? 0}/${total}, rep=${attributes.reputation ?? "?"}`;
}
