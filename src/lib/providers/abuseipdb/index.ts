import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { abuseipdbLookup, abuseipdbReport } from "./api";

export const abuseipdbProvider: ProviderAdapter = {
  id: "abuseipdb",
  name: "AbuseIPDB",
  description: "Check and report abusive IPv4 addresses. Reports become public.",
  supportedTypes: ["ipv4"],
  capabilities: ["report", "lookup"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: ["ABUSEIPDB_API_KEY", "ABUSEIPDB_ENABLED"],
  publicSubmissionPossible: true,
  warning:
    "Reports require category + comment. Reported IPs become public AbuseIPDB records.",
  async getStatus() {
    const e = env();
    const configured = !!e.ABUSEIPDB_API_KEY;
    return {
      id: "abuseipdb",
      enabled: e.ABUSEIPDB_ENABLED,
      configured,
      available: e.ABUSEIPDB_ENABLED && configured,
      reason: configured ? "API key set" : "Missing API key",
    };
  },
  report: abuseipdbReport,
  lookup: abuseipdbLookup,
};
