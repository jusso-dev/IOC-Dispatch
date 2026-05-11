import { env } from "@/lib/env";
import { httpFetch } from "@/lib/providers/http";
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

  if (input.mode === "dry_run") {
    return success(ID, { message: "dry run" });
  }

  const threatTypes = ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"];
  const url =
    `https://webrisk.googleapis.com/v1/uris:search` +
    `?key=${encodeURIComponent(e.GOOGLE_WEB_RISK_API_KEY)}` +
    `&uri=${encodeURIComponent(input.indicator.normalizedValue)}` +
    threatTypes.map((t) => `&threatTypes=${t}`).join("");

  try {
    const res = await httpFetch(url);
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return failed(ID, `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`, data);
    }
    return success(ID, { raw: data });
  } catch (err) {
    return failed(ID, (err as Error).message);
  }
}
