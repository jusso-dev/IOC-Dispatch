import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { webRiskLookup } from "./api";

export const googleWebRiskProvider: ProviderAdapter = {
  id: "google_web_risk",
  name: "Google Web Risk",
  description:
    "Enterprise URL lookup against Google's threat lists (commercial Web Risk API).",
  supportedTypes: ["url"],
  capabilities: ["lookup"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: ["GOOGLE_WEB_RISK_API_KEY", "GOOGLE_WEB_RISK_ENABLED"],
  publicSubmissionPossible: false,
  warning: "Lookup-only. Requires Google Cloud project with Web Risk enabled.",
  async getStatus() {
    const e = env();
    const configured = !!e.GOOGLE_WEB_RISK_API_KEY;
    return {
      id: "google_web_risk",
      enabled: e.GOOGLE_WEB_RISK_ENABLED,
      configured,
      available: e.GOOGLE_WEB_RISK_ENABLED && configured,
      reason: configured ? "API key set" : "Missing API key",
    };
  },
  lookup: webRiskLookup,
};
