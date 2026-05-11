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

  try {
    const res = await httpFetch("https://checkurl.phishtank.com/checkurl/", {
      method: "POST",
      headers: {
        "User-Agent": "phishtank/intelrelay",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok)
      return failed(ID, `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`, data);
    return success(ID, { raw: data });
  } catch (err) {
    return failed(ID, (err as Error).message);
  }
}
