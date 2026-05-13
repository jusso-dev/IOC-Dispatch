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

const ID = "microsoft_defender_ti";
const TOKEN_EARLY_REFRESH_MS = 60_000;

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
let inflight: Promise<string> | null = null;

async function fetchAccessToken(): Promise<string> {
  const e = env();
  if (!e.MICROSOFT_TENANT_ID || !e.MICROSOFT_CLIENT_ID || !e.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Missing Microsoft tenant/client credentials");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: e.MICROSOFT_CLIENT_ID,
    client_secret: e.MICROSOFT_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await httpFetch(
    `https://login.microsoftonline.com/${encodeURIComponent(
      e.MICROSOFT_TENANT_ID
    )}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  const decoded = await decodeResponse(res);
  const data = decoded.body as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Microsoft token endpoint returned HTTP ${res.status}: ${describeHttpError(decoded)}`
    );
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

/** Single-flight wrapper around token acquisition so we don't stampede AAD. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_EARLY_REFRESH_MS) {
    return cachedToken.token;
  }
  if (!inflight) {
    inflight = fetchAccessToken().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function msDefenderTiLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.MICROSOFT_DEFENDER_TI_ENABLED)
    return disabled(ID, "MICROSOFT_DEFENDER_TI_ENABLED=false");

  if (!e.MICROSOFT_TENANT_ID || !e.MICROSOFT_CLIENT_ID || !e.MICROSOFT_CLIENT_SECRET) {
    return disabled(ID, "Missing Microsoft tenant/client credentials");
  }

  const t = input.indicator.type;
  if (!["url", "domain", "ipv4", "md5", "sha1", "sha256"].includes(t)) {
    return unsupported(ID, `MS Defender TI cannot lookup ${t}`);
  }

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    const url =
      `https://graph.microsoft.com/beta/security/threatIntelligence/articles?` +
      `$search="${encodeURIComponent(input.indicator.normalizedValue)}"&$top=5`;

    const res = await httpFetch(url, { headers });
    const decoded = await decodeResponse(res);

    // 401 typically means the cached token has been revoked; drop it so the
    // next call refetches.
    if (res.status === 401) {
      cachedToken = null;
      return failed(
        ID,
        `Microsoft Graph rejected token: ${describeHttpError(decoded)}`,
        decoded.body
      );
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
      redactedRequest: redact({ url, headers }),
    });
  } catch (err) {
    if (err instanceof RateLimitedError) return rateLimited(ID);
    if (err instanceof HttpTimeoutError) {
      return failed(ID, `request timed out after ${err.timeoutMs}ms`);
    }
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}
