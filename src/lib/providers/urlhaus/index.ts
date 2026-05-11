import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { urlhausLookup, urlhausSubmit } from "./api";

export const urlhausProvider: ProviderAdapter = {
  id: "urlhaus",
  name: "URLhaus / abuse.ch",
  description:
    "Submit malware URLs to URLhaus, or look up whether a URL is already listed. Submissions and lookups both require an Auth-Key (free, abuse.ch).",
  supportedTypes: ["url"],
  capabilities: ["submit", "lookup"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: ["URLHAUS_AUTH_KEY", "URLHAUS_ENABLED"],
  publicSubmissionPossible: true,
  warning:
    "Submissions become publicly visible. As of 2024, URLhaus also requires an Auth-Key for lookups. Get one at https://auth.abuse.ch.",
  async getStatus() {
    const e = env();
    const configured = !!e.URLHAUS_AUTH_KEY;
    return {
      id: "urlhaus",
      enabled: e.URLHAUS_ENABLED,
      configured,
      available: e.URLHAUS_ENABLED && configured,
      reason: configured
        ? "Auth-Key set"
        : "URLHAUS_AUTH_KEY missing (register at auth.abuse.ch)",
    };
  },
  submit: urlhausSubmit,
  lookup: urlhausLookup,
};
