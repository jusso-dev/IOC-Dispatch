import { env } from "@/lib/env";
import { moduleLogger } from "@/lib/logger";
import {
  decodeResponse,
  describeHttpError,
  httpFetch,
  redact,
} from "@/lib/providers/http";
import { disabled, failed, success, unsupported } from "@/lib/providers/result";
import type {
  ProviderSubmissionInput,
  ProviderSubmissionResult,
} from "@/lib/providers/types";
import type { IndicatorType } from "@/lib/indicators/types";

const ID = "misp";
const log = moduleLogger("misp");

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

/**
 * MISP self-hosting often runs with a self-signed certificate. Node's global
 * fetch can't override TLS verification per-request without swapping in a
 * custom Undici dispatcher, which we deliberately don't ship by default — it
 * would also affect every other outbound call. We log a warning so operators
 * can choose to set `NODE_TLS_REJECT_UNAUTHORIZED=0` for the worker process
 * if they really need it.
 */
function warnIfTlsVerifyMismatched(tlsVerify: boolean): void {
  if (tlsVerify) return;
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") return;
  log.warn(
    "MISP_VERIFY_TLS=false but NODE_TLS_REJECT_UNAUTHORIZED is not 0; TLS verification remains strict. " +
      "Set the env var on the IntelRelay process if you trust the MISP cert chain."
  );
}

export async function mispSubmit(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.MISP_ENABLED) return disabled(ID, "MISP_ENABLED=false");
  if (!e.MISP_BASE_URL) return disabled(ID, "Missing MISP_BASE_URL");
  if (!e.MISP_API_KEY) return disabled(ID, "Missing MISP_API_KEY");

  const mispType = MISP_TYPE_MAP[input.indicator.type];
  if (!mispType) return unsupported(ID, `MISP cannot store ${input.indicator.type}`);

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run",
      raw: { mispType, value: input.indicator.normalizedValue },
    });
  }

  warnIfTlsVerifyMismatched(e.MISP_VERIFY_TLS);

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
      });
      const evDecoded = await decodeResponse(evRes);
      const evData = evDecoded.body as { Event?: { id?: string } };
      if (!evRes.ok || !evData?.Event?.id) {
        return failed(
          ID,
          `MISP event/add failed: HTTP ${evRes.status} (${describeHttpError(evDecoded)})`,
          evDecoded.body,
          { redactedRequest: redact({ url: `${base}/events/add`, headers }) }
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
    const attrRes = await httpFetch(`${base}/attributes/add/${targetEventId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(attrBody),
    });
    const attrDecoded = await decodeResponse(attrRes);
    if (!attrRes.ok) {
      return failed(
        ID,
        `MISP attribute/add failed: HTTP ${attrRes.status} (${describeHttpError(attrDecoded)})`,
        attrDecoded.body,
        { redactedRequest: redact({ headers }) }
      );
    }

    for (const tag of tags) {
      try {
        await httpFetch(`${base}/tags/attachTagToObject`, {
          method: "POST",
          headers,
          body: JSON.stringify({ uuid: targetEventId, tag }),
        });
      } catch (err) {
        log.warn("attachTagToObject failed", { tag, err });
      }
    }

    return success(ID, {
      externalId: targetEventId,
      externalUrl: `${base}/events/view/${targetEventId}`,
      raw: attrDecoded.body,
      message: `attribute added to event ${targetEventId}`,
      redactedRequest: redact({ headers }),
    });
  } catch (err) {
    return failed(ID, err instanceof Error ? err.message : String(err));
  }
}

function defaultCategory(t: IndicatorType): string {
  switch (t) {
    case "url":
    case "domain":
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
