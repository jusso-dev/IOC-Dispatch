import { env } from "@/lib/env";
import {
  decodeResponse,
  describeHttpError,
  httpFetch,
  HttpTimeoutError,
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

const ID = "google_web_risk";

export async function webRiskLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.GOOGLE_WEB_RISK_ENABLED)
    return disabled(ID, "GOOGLE_WEB_RISK_ENABLED=false");
  if (!e.GOOGLE_WEB_RISK_API_KEY)
    return disabled(ID, "Missing GOOGLE_WEB_RISK_API_KEY");
  if (input.indicator.type !== "url")
    return unsupported(ID, "Web Risk accepts URL only");

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  const threatTypes = ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"];
  const url =
    `https://webrisk.googleapis.com/v1/uris:search` +
    `?key=${encodeURIComponent(e.GOOGLE_WEB_RISK_API_KEY)}` +
    `&uri=${encodeURIComponent(input.indicator.normalizedValue)}` +
    threatTypes.map((t) => `&threatTypes=${t}`).join("");

  try {
    const res = await httpFetch(url);
    const decoded = await decodeResponse(res);
    if (!res.ok) {
      return failed(
        ID,
        `HTTP ${res.status}: ${describeHttpError(decoded)}`,
        decoded.body
      );
    }
    const threat = (decoded.body.threat as { threatTypes?: string[] } | undefined)
      ?.threatTypes;
    return success(ID, {
      raw: decoded.body,
      message: threat?.length ? `threat: ${threat.join(",")}` : "no match",
    });
  } catch (err) {
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}
