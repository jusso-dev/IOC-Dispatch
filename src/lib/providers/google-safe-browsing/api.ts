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

const ID = "google_safe_browsing";

export async function gsbLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.GOOGLE_SAFE_BROWSING_ENABLED)
    return disabled(ID, "GOOGLE_SAFE_BROWSING_ENABLED=false");
  if (!e.GOOGLE_SAFE_BROWSING_API_KEY)
    return disabled(ID, "Missing GOOGLE_SAFE_BROWSING_API_KEY");
  if (input.indicator.type !== "url")
    return unsupported(ID, "Safe Browsing accepts URL only");

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  const body = JSON.stringify({
    client: { clientId: "intelrelay", clientVersion: "0.1.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: input.indicator.normalizedValue }],
    },
  });

  try {
    const url = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(
      e.GOOGLE_SAFE_BROWSING_API_KEY
    )}`;
    const res = await httpFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const matches = Array.isArray(decoded.body.matches)
      ? (decoded.body.matches as unknown[])
      : [];
    return success(ID, {
      raw: decoded.body,
      message: matches.length ? `match: ${matches.length}` : "no matches",
    });
  } catch (err) {
    if (err instanceof HttpTimeoutError) return failed(ID, err.message);
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

export async function gsbSubmit(): Promise<ProviderSubmissionResult> {
  return {
    providerId: ID,
    status: "unsupported",
    message:
      "Safe Browsing is a lookup-only API. Use Google's Report Phishing form manually.",
  };
}
