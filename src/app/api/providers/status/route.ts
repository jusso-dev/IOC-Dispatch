import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/handler";
import { moduleLogger } from "@/lib/logger";
import { listProviders } from "@/lib/providers/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = moduleLogger("api.providers");

const STATUS_PROBE_TIMEOUT_MS = 5_000;

/** Resolve to a fallback when the probe runs too long or throws. */
async function safeStatus(
  providerId: string,
  promise: Promise<unknown>
): Promise<unknown> {
  const timeout = new Promise<unknown>((resolve) => {
    setTimeout(() => {
      log.warn("getStatus probe timed out", { providerId });
      resolve({
        id: providerId,
        enabled: false,
        configured: false,
        available: false,
        reason: `status probe timed out after ${STATUS_PROBE_TIMEOUT_MS}ms`,
      });
    }, STATUS_PROBE_TIMEOUT_MS).unref?.();
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch (err) {
    log.warn("getStatus probe threw", { providerId, err });
    return {
      id: providerId,
      enabled: false,
      configured: false,
      available: false,
      reason: "status probe failed",
    };
  }
}

export const GET = withErrorHandling("GET /api/providers/status", async () => {
  const providers = await Promise.all(
    listProviders().map(async (p) => {
      const status = await safeStatus(p.id, Promise.resolve(p.getStatus()));
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        supportedTypes: p.supportedTypes,
        capabilities: p.capabilities,
        preferredTransport: p.preferredTransport,
        availableTransports: p.availableTransports,
        requiresApiKey: p.requiresApiKey,
        requiresLogin: p.requiresLogin,
        publicSubmissionPossible: p.publicSubmissionPossible,
        warning: p.warning,
        status,
      };
    })
  );
  return NextResponse.json({ providers });
});
