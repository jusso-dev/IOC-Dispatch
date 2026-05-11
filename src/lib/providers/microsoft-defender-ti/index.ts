import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { msDefenderTiLookup } from "./api";

export const microsoftDefenderTiProvider: ProviderAdapter = {
  id: "microsoft_defender_ti",
  name: "Microsoft Defender TI",
  description:
    "Lookup/enrich indicators using Microsoft Graph Threat Intelligence (Defender TI). No Playwright.",
  supportedTypes: ["url", "domain", "ipv4", "md5", "sha1", "sha256"],
  capabilities: ["lookup", "enrich"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: [
    "MICROSOFT_TENANT_ID",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "MICROSOFT_DEFENDER_TI_ENABLED",
  ],
  publicSubmissionPossible: false,
  warning:
    "Requires Azure AD app + tenant license for Defender TI. No browser automation.",
  async getStatus() {
    const e = env();
    const configured =
      !!e.MICROSOFT_TENANT_ID &&
      !!e.MICROSOFT_CLIENT_ID &&
      !!e.MICROSOFT_CLIENT_SECRET;
    return {
      id: "microsoft_defender_ti",
      enabled: e.MICROSOFT_DEFENDER_TI_ENABLED,
      configured,
      available: e.MICROSOFT_DEFENDER_TI_ENABLED && configured,
      reason: configured ? "Azure AD app configured" : "Missing AAD credentials",
    };
  },
  lookup: msDefenderTiLookup,
  enrich: msDefenderTiLookup,
};
