import { env } from "@/lib/env";
import {
  decodeResponse,
  httpFetch,
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

const ID = "crowdsec";
const BASE = "https://cti.api.crowdsec.net/v2";

interface OverallScores {
  aggressiveness?: number;
  threat?: number;
  trust?: number;
  anomaly?: number;
  total?: number;
}

function summarize(data: Record<string, unknown>): string | undefined {
  const scores = (data.scores as { overall?: OverallScores } | undefined)
    ?.overall;
  const classifications = data.classifications as
    | { classifications?: Array<{ label?: string }> }
    | undefined;
  const behaviors = data.behaviors as Array<{ label?: string }> | undefined;
  const bgNoise = data.background_noise as string | undefined;

  const parts: string[] = [];
  if (scores?.total !== undefined) parts.push(`overall=${scores.total}`);
  if (scores?.threat !== undefined) parts.push(`threat=${scores.threat}`);
  if (scores?.aggressiveness !== undefined)
    parts.push(`agg=${scores.aggressiveness}`);
  if (bgNoise) parts.push(`noise=${bgNoise}`);
  const labels = classifications?.classifications
    ?.map((c) => c.label)
    .filter(Boolean) as string[] | undefined;
  if (labels && labels.length)
    parts.push(`tags=${labels.slice(0, 3).join(",")}`);
  const bLabels = behaviors?.map((b) => b.label).filter(Boolean) as
    | string[]
    | undefined;
  if (bLabels && bLabels.length)
    parts.push(`behaviors=${bLabels.slice(0, 2).join(",")}`);
  return parts.length ? parts.join(" · ") : undefined;
}

export async function crowdsecLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.CROWDSEC_ENABLED) return disabled(ID, "CROWDSEC_ENABLED=false");
  if (!e.CROWDSEC_API_KEY) return disabled(ID, "Missing CROWDSEC_API_KEY");
  if (input.indicator.type !== "ipv4")
    return unsupported(ID, "CrowdSec CTI accepts IPv4 only");

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  const ip = input.indicator.normalizedValue;
  const url = `${BASE}/smoke/${encodeURIComponent(ip)}`;
  const headers: Record<string, string> = {
    "x-api-key": e.CROWDSEC_API_KEY,
    Accept: "application/json",
  };

  try {
    const res = await httpFetch(url, {
      headers,
      rateLimitKey: ID,
      perMinute: e.CROWDSEC_RATE_LIMIT_PER_MINUTE,
    });

    // 404 from CrowdSec means "not in CTI corpus" — that's still a useful lookup result.
    if (res.status === 404) {
      const decoded = await decodeResponse(res);
      return success(ID, {
        message: "not in CTI corpus",
        raw: decoded.body,
        redactedRequest: redact({ url, headers }, ["x-api-key"]),
      });
    }

    if (res.status === 429) {
      const decoded = await decodeResponse(res);
      return rateLimited(
        ID,
        "remote",
        (decoded.body.message as string) ??
          "CrowdSec returned HTTP 429 (free tier ratelimit)"
      );
    }

    const decoded = await decodeResponse(res);
    if (!res.ok) {
      return failed(
        ID,
        `HTTP ${res.status}${
          (decoded.body.message as string)
            ? `: ${decoded.body.message as string}`
            : ""
        }`,
        decoded.body
      );
    }

    return success(ID, {
      raw: decoded.body,
      message: summarize(decoded.body) ?? "ok",
      externalUrl: `https://app.crowdsec.net/cti/${encodeURIComponent(ip)}`,
      redactedRequest: redact({ url, headers }, ["x-api-key"]),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    return failed(ID, (err as Error).message);
  }
}
