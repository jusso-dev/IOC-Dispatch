import { env } from "@/lib/env";
import {
  decodeResponse,
  describeHttpError,
  httpFetch,
  HttpTimeoutError,
  redact,
} from "@/lib/providers/http";
import {
  disabled,
  failed,
  success,
  unsupported,
} from "@/lib/providers/result";
import type {
  ProviderSubmissionInput,
  ProviderSubmissionResult,
} from "@/lib/providers/types";

const ID = "phishtank";

export async function phishtankLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.PHISHTANK_ENABLED) return disabled(ID, "PHISHTANK_ENABLED=false");
  if (input.indicator.type !== "url")
    return unsupported(ID, "PhishTank accepts URL only");

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  const body = new URLSearchParams({
    url: input.indicator.normalizedValue,
    format: "json",
  });
  if (e.PHISHTANK_API_KEY) body.set("app_key", e.PHISHTANK_API_KEY);

  const headers: Record<string, string> = {
    "User-Agent": "phishtank/intelrelay",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const res = await httpFetch("https://checkurl.phishtank.com/checkurl/", {
      method: "POST",
      headers,
      body,
    });
    const decoded = await decodeResponse(res);
    if (!res.ok) {
      return failed(
        ID,
        `HTTP ${res.status}: ${describeHttpError(decoded)}`,
        decoded.body
      );
    }
    return success(ID, {
      raw: decoded.body,
      redactedRequest: redact({ headers, body: body.toString() }),
    });
  } catch (err) {
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}
