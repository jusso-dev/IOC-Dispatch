import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { gsbLookup } from "./api";

export const googleSafeBrowsingProvider: ProviderAdapter = {
  id: "google_safe_browsing",
  name: "Google Safe Browsing",
  description:
    "Look up whether a URL appears on Google's Safe Browsing threat lists. Lookup-only.",
  supportedTypes: ["url"],
  capabilities: ["lookup"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: ["GOOGLE_SAFE_BROWSING_API_KEY", "GOOGLE_SAFE_BROWSING_ENABLED"],
  publicSubmissionPossible: false,
  warning: "Safe Browsing is lookup-only. It does not submit threat intel.",
  async getStatus() {
    const e = env();
    const configured = !!e.GOOGLE_SAFE_BROWSING_API_KEY;
    return {
      id: "google_safe_browsing",
      enabled: e.GOOGLE_SAFE_BROWSING_ENABLED,
      configured,
      available: e.GOOGLE_SAFE_BROWSING_ENABLED && configured,
      reason: configured ? "API key set" : "Missing API key",
    };
  },
  lookup: gsbLookup,
};
