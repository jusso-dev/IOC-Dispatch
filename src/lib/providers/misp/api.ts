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

const ID = "misp";

const MISP_TYPE_MAP: Record<IndicatorType, string | null> = {
  url: "url",
  domain: "domain",
  ipv4: "ip-dst",
  md5: "md5",
  sha1: "sha1",
  sha256: "sha256",
  email: "email-src",
  unknown: null,
};

function fetchOpts(tlsVerify: boolean): RequestInit {
  // Node global fetch honors NODE_TLS_REJECT_UNAUTHORIZED env var; an Agent override
  // is not exposed cleanly here. We surface a warning instead when verify=false.
  if (!tlsVerify && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    console.warn(
      "[misp] MISP_VERIFY_TLS=false but NODE_TLS_REJECT_UNAUTHORIZED is not 0; TLS still strict."
    );
  }
  return {};
}

export async function mispSubmit(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.MISP_ENABLED) return disabled(ID, "MISP_ENABLED=false");
  if (!e.MISP_BASE_URL) return disabled(ID, "Missing MISP_BASE_URL");
  if (!e.MISP_API_KEY) return disabled(ID, "Missing MISP_API_KEY");

  const mispType = MISP_TYPE_MAP[input.indicator.type];
  if (!mispType)
    return unsupported(ID, `MISP cannot store ${input.indicator.type}`);

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run",
      raw: { mispType, value: input.indicator.normalizedValue },
    });
  }

  const eventId = input.extra?.eventId as string | undefined;
  const distribution = (input.extra?.distribution as number | undefined) ?? 0;
  const threatLevel = (input.extra?.threatLevel as number | undefined) ?? 3;
  const analysis = (input.extra?.analysis as number | undefined) ?? 0;
  const publish = (input.extra?.publish as boolean | undefined) ?? false;
  const tags = input.tags ?? [];
  const base = e.MISP_BASE_URL.replace(/\/$/, "");

  const headers: Record<string, string> = {
    Authorization: e.MISP_API_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  try {
    let targetEventId = eventId;

    if (!targetEventId) {
      const evBody = {
        Event: {
          info: `IntelRelay batch: ${input.comment ?? "auto-created event"}`,
          distribution: String(distribution),
          threat_level_id: String(threatLevel),
          analysis: String(analysis),
          published: publish,
        },
      };
      const evRes = await httpFetch(`${base}/events/add`, {
        method: "POST",
        headers,
        body: JSON.stringify(evBody),
        ...fetchOpts(e.MISP_VERIFY_TLS),
      });
      const evData = (await evRes.json().catch(() => ({}))) as {
        Event?: { id?: string };
      };
      if (!evRes.ok || !evData?.Event?.id) {
        return failed(
          ID,
          `MISP event/add failed: HTTP ${evRes.status}`,
          evData
        );
      }
      targetEventId = evData.Event.id;
    }

    const attrBody = {
      Attribute: {
        type: mispType,
        value: input.indicator.normalizedValue,
        category: defaultCategory(input.indicator.type),
        distribution: String(distribution),
        comment: input.comment ?? "",
      },
    };
    const attrRes = await httpFetch(
      `${base}/attributes/add/${targetEventId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(attrBody),
        ...fetchOpts(e.MISP_VERIFY_TLS),
      }
    );
    const attrData = (await attrRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!attrRes.ok) {
      return failed(
        ID,
        `MISP attribute/add failed: HTTP ${attrRes.status}`,
        attrData
      );
    }

    if (tags.length) {
      for (const t of tags) {
        await httpFetch(`${base}/tags/attachTagToObject`, {
          method: "POST",
          headers,
          body: JSON.stringify({ uuid: targetEventId, tag: t }),
          ...fetchOpts(e.MISP_VERIFY_TLS),
        }).catch(() => undefined);
      }
    }

    return success(ID, {
      externalId: targetEventId,
      externalUrl: `${base}/events/view/${targetEventId}`,
      raw: attrData,
      redactedRequest: redact({ headers }, ["Authorization"]),
    });
  } catch (err) {
    return failed(ID, (err as Error).message);
  }
}

function defaultCategory(t: IndicatorType): string {
  switch (t) {
    case "url":
    case "domain":
      return "Network activity";
    case "ipv4":
      return "Network activity";
    case "md5":
    case "sha1":
    case "sha256":
      return "Payload delivery";
    case "email":
      return "Targeting data";
    default:
      return "Other";
  }
}
