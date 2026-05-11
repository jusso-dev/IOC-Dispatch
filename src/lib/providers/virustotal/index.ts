import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { vtLookup, vtScan } from "./api";

export const virustotalProvider: ProviderAdapter = {
  id: "virustotal",
  name: "VirusTotal",
  description:
    "Lookup/enrich URLs, domains, IPs, and file hashes against VirusTotal. Optional active URL scan.",
  supportedTypes: ["url", "domain", "ipv4", "md5", "sha1", "sha256"],
  capabilities: ["lookup", "enrich", "scan"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: [
    "VIRUSTOTAL_API_KEY",
    "VIRUSTOTAL_ENABLED",
    "VIRUSTOTAL_ALLOW_ACTIVE_URL_SCAN",
  ],
  publicSubmissionPossible: true,
  warning:
    "Active URL submissions are public. Disabled by default via VIRUSTOTAL_ALLOW_ACTIVE_URL_SCAN.",
  async getStatus() {
    const e = env();
    const configured = !!e.VIRUSTOTAL_API_KEY;
    return {
      id: "virustotal",
      enabled: e.VIRUSTOTAL_ENABLED,
      configured,
      available: e.VIRUSTOTAL_ENABLED && configured,
      reason: configured ? "API key set" : "Missing API key",
    };
  },
  lookup: vtLookup,
  enrich: vtLookup,
  scan: vtScan,
};
