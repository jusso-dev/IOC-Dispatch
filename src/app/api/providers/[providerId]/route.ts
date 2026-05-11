import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers/registry";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await ctx.params;
  const p = getProvider(providerId);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  const status = await p.getStatus();
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
