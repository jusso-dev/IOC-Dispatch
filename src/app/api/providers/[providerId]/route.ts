import { NextResponse } from "next/server";
import { apiError, withErrorHandling } from "@/lib/api/handler";
import { moduleLogger } from "@/lib/logger";
import { getProvider } from "@/lib/providers/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = moduleLogger("api.providers");

interface RouteCtx {
  params: Promise<{ providerId: string }>;
}

export const GET = withErrorHandling(
  "GET /api/providers/[providerId]",
  async (_req: Request, ctx: RouteCtx) => {
    const { providerId } = await ctx.params;
    const p = getProvider(providerId);
    if (!p) return apiError("provider not found", 404);

    let status;
    try {
      status = await p.getStatus();
    } catch (err) {
      log.warn("getStatus threw", { providerId: p.id, err });
      status = {
        id: p.id,
        enabled: false,
        configured: false,
        available: false,
        reason: "status probe failed",
      };
    }

    return NextResponse.json({
      id: p.id,
      name: p.name,
      description: p.description,
      supportedTypes: p.supportedTypes,
      capabilities: p.capabilities,
      preferredTransport: p.preferredTransport,
      availableTransports: p.availableTransports,
      envVars: p.envVars,
      publicSubmissionPossible: p.publicSubmissionPossible,
      warning: p.warning,
      requiresApiKey: p.requiresApiKey,
      requiresLogin: p.requiresLogin,
      status,
    });
  }
);
