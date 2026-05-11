import { NextResponse } from "next/server";
import { listProviders } from "@/lib/providers/registry";

export async function GET() {
  const providers = await Promise.all(
    listProviders().map(async (p) => {
      const status = await p.getStatus();
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
}
