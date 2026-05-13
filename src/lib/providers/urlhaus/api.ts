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

const ID = "urlhaus";
const BASE = "https://urlhaus-api.abuse.ch/v1";

function authHeaders(): Record<string, string> | null {
  const key = env().URLHAUS_AUTH_KEY;
  if (!key) return null;
  return { "Auth-Key": key };
}

export async function urlhausSubmit(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.URLHAUS_ENABLED) return disabled(ID, "URLHAUS_ENABLED=false");
  if (input.indicator.type !== "url")
    return unsupported(ID, "URLhaus accepts URL only");

  const auth = authHeaders();
  if (!auth) {
    return disabled(
      ID,
      "URLhaus requires an Auth-Key. Set URLHAUS_AUTH_KEY (register at https://auth.abuse.ch)."
    );
  }

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run",
      raw: { url: input.indicator.normalizedValue },
    });
  }

  const threatType = (input.extra?.threatType as string) ?? "malware_download";
  const malwareFamily = (input.extra?.malwareFamily as string) ?? "";
  const tags = (input.extra?.tags as string[]) ?? input.tags ?? [];

  const body = new URLSearchParams({
    anonymous: "0",
    submission: JSON.stringify({
      threat: threatType,
      url: input.indicator.normalizedValue,
      tags: tags.join(","),
      malware: malwareFamily,
      reference: "",
      comment: input.comment ?? "Submitted via IntelRelay",
    }),
  });

  const headers: Record<string, string> = {
    ...auth,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const res = await httpFetch(`${BASE}/submit/`, {
      method: "POST",
      headers,
      body,
      rateLimitKey: ID,
      perMinute: e.URLHAUS_RATE_LIMIT_PER_MINUTE,
    });
    const decoded = await decodeResponse(res);
    const data = decoded.body;

    if (res.status === 429) {
      return rateLimited(ID, "remote", describeHttpError(decoded));
    }

    const queryStatus = (data.query_status as string) ?? "";
    const submissionStatus =
      ((data.submission as { status?: string } | undefined)?.status as string) ?? "";

    if (res.ok && (queryStatus === "ok" || submissionStatus === "ok")) {
      return success(ID, {
        externalUrl:
          typeof data.urlhaus_reference === "string"
            ? (data.urlhaus_reference as string)
            : undefined,
        message: "submitted",
        raw: data,
        redactedRequest: redact({ headers, body: body.toString() }),
      });
    }
    return failed(
      ID,
      `HTTP ${res.status}${queryStatus ? `: ${queryStatus}` : ""}`,
      data,
      { redactedRequest: redact({ headers, body: body.toString() }) }
    );
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

export async function urlhausLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.URLHAUS_ENABLED) return disabled(ID, "URLHAUS_ENABLED=false");
  if (input.indicator.type !== "url")
    return unsupported(ID, "URLhaus lookup accepts URL only");

  const auth = authHeaders();
  if (!auth) {
    return disabled(
      ID,
      "URLhaus requires an Auth-Key. Set URLHAUS_AUTH_KEY (register at https://auth.abuse.ch)."
    );
  }

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run",
      raw: { url: input.indicator.normalizedValue },
    });
  }

  const body = new URLSearchParams({ url: input.indicator.normalizedValue });
  const headers: Record<string, string> = {
    ...auth,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  try {
    const res = await httpFetch(`${BASE}/url/`, {
      method: "POST",
      headers,
      body,
      rateLimitKey: ID,
      perMinute: e.URLHAUS_RATE_LIMIT_PER_MINUTE,
    });
    const decoded = await decodeResponse(res);
    if (res.status === 429) {
      return rateLimited(ID, "remote", describeHttpError(decoded));
    }
    const data = decoded.body;
    const queryStatus = (data.query_status as string) ?? "";
    if (!res.ok) {
      return failed(
        ID,
        `HTTP ${res.status}${queryStatus ? `: ${queryStatus}` : ""}`,
        data
      );
    }
    return success(ID, {
      raw: data,
      message:
        queryStatus === "ok"
          ? `listed (${(data.threat as string) ?? "url"})`
          : queryStatus === "no_results"
            ? "not in corpus"
            : queryStatus || "ok",
      externalUrl:
        typeof data.urlhaus_reference === "string"
          ? (data.urlhaus_reference as string)
          : undefined,
      redactedRequest: redact({ headers, body: body.toString() }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}
