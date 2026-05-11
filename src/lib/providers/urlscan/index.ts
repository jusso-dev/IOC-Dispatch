import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { urlscanLookup, urlscanScan } from "./api";

export const urlscanProvider: ProviderAdapter = {
  id: "urlscan",
  name: "urlscan.io",
  description: "Scan URLs with urlscan.io. Visibility configurable.",
  supportedTypes: ["url", "domain"],
  capabilities: ["scan", "lookup"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: ["URLSCAN_API_KEY", "URLSCAN_ENABLED", "URLSCAN_DEFAULT_VISIBILITY"],
  publicSubmissionPossible: true,
  warning: "Public scans become globally searchable. Default is `unlisted`.",
  async getStatus() {
    const e = env();
    const configured = !!e.URLSCAN_API_KEY;
    return {
      id: "urlscan",
      enabled: e.URLSCAN_ENABLED,
      configured,
      available: e.URLSCAN_ENABLED && configured,
      reason: configured ? "API key set" : "Missing URLSCAN_API_KEY",
    };
  },
  scan: urlscanScan,
  lookup: urlscanLookup,
};
