import { env } from "@/lib/env";
import { httpFetch, redact } from "@/lib/providers/http";
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

const ID = "microsoft_defender_ti";

interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string | null> {
  const e = env();
  if (!e.MICROSOFT_TENANT_ID || !e.MICROSOFT_CLIENT_ID || !e.MICROSOFT_CLIENT_SECRET)
    return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.token;

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
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `MSAL token error: ${data.error_description ?? res.status}`
    );
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export async function msDefenderTiLookup(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.MICROSOFT_DEFENDER_TI_ENABLED)
    return disabled(ID, "MICROSOFT_DEFENDER_TI_ENABLED=false");

  const t = input.indicator.type;
  if (!["url", "domain", "ipv4", "md5", "sha1", "sha256"].includes(t))
    return unsupported(ID, `MS Defender TI cannot lookup ${t}`);

  if (input.mode === "dry_run") return success(ID, { message: "dry run" });

  try {
    const token = await getAccessToken();
    if (!token) return disabled(ID, "Missing tenant/client credentials");

    // Defender TI is available via Microsoft Graph security/threatIntelligence endpoints.
    // Endpoints accept the indicator value; Graph normalizes.
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    const url = `https://graph.microsoft.com/beta/security/threatIntelligence/articles?$search="${encodeURIComponent(
      input.indicator.normalizedValue
    )}"&$top=5`;

    const res = await httpFetch(url, {
      headers,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok)
      return failed(ID, `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`, data);
    return success(ID, {
      raw: data,
      redactedRequest: redact({ headers }, ["Authorization"]),
    });
  } catch (err) {
    return failed(ID, (err as Error).message);
  }
}
