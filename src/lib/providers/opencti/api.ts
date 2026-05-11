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
import type { IndicatorType } from "@/lib/indicators/types";

const ID = "opencti";

const STIX_PATTERN: Record<IndicatorType, ((v: string) => string) | null> = {
  url: (v) => `[url:value = '${escapeStix(v)}']`,
  domain: (v) => `[domain-name:value = '${escapeStix(v)}']`,
  ipv4: (v) => `[ipv4-addr:value = '${escapeStix(v)}']`,
  md5: (v) => `[file:hashes.MD5 = '${escapeStix(v)}']`,
  sha1: (v) => `[file:hashes.'SHA-1' = '${escapeStix(v)}']`,
  sha256: (v) => `[file:hashes.'SHA-256' = '${escapeStix(v)}']`,
  email: (v) => `[email-addr:value = '${escapeStix(v)}']`,
  unknown: null,
};

function escapeStix(v: string): string {
  return v.replace(/'/g, "\\'");
}

export async function openctiSubmit(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.OPENCTI_ENABLED) return disabled(ID, "OPENCTI_ENABLED=false");
  if (!e.OPENCTI_BASE_URL) return disabled(ID, "Missing OPENCTI_BASE_URL");
  if (!e.OPENCTI_API_KEY) return disabled(ID, "Missing OPENCTI_API_KEY");

  const patFn = STIX_PATTERN[input.indicator.type];
  if (!patFn) return unsupported(ID, `OpenCTI cannot store ${input.indicator.type}`);

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run",
      raw: { pattern: patFn(input.indicator.normalizedValue) },
    });
  }

  const pattern = patFn(input.indicator.normalizedValue);
  const description = input.comment ?? "Submitted via IntelRelay";
  const labels = input.tags ?? [];

  const query = `
    mutation IntelRelayIndicatorAdd($input: IndicatorAddInput!) {
      indicatorAdd(input: $input) {
        id
        standard_id
        pattern
        name
      }
    }
  `;

  const variables = {
    input: {
      name: input.indicator.normalizedValue,
      pattern,
      pattern_type: "stix",
      x_opencti_main_observable_type: mainObservable(input.indicator.type),
      description,
      objectLabel: labels,
    },
  };

  const base = e.OPENCTI_BASE_URL.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${e.OPENCTI_API_KEY}`,
    "Content-Type": "application/json",
  };
  try {
    const res = await httpFetch(`${base}/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: { indicatorAdd?: { id?: string; standard_id?: string } };
      errors?: unknown;
    };
    if (!res.ok || data.errors)
      return failed(
        ID,
        `OpenCTI error: HTTP ${res.status} ${JSON.stringify(data.errors ?? {}).slice(0, 200)}`,
        data
      );
    const id = data.data?.indicatorAdd?.id;
    return success(ID, {
      externalId: id,
      externalUrl: id ? `${base}/dashboard/observations/indicators/${id}` : undefined,
      raw: data,
      redactedRequest: redact({ headers }, ["Authorization"]),
    });
  } catch (err) {
    return failed(ID, (err as Error).message);
  }
}

function mainObservable(t: IndicatorType): string {
  switch (t) {
    case "url":
      return "Url";
    case "domain":
      return "Domain-Name";
    case "ipv4":
      return "IPv4-Addr";
    case "md5":
    case "sha1":
    case "sha256":
      return "StixFile";
    case "email":
      return "Email-Addr";
    default:
      return "Unknown";
  }
}
