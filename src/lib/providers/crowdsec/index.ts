import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { crowdsecLookup } from "./api";

export const crowdsecProvider: ProviderAdapter = {
  id: "crowdsec",
  name: "CrowdSec CTI",
  description:
    "Look up IPv4 reputation in the CrowdSec community Cyber Threat Intel database. Returns scores, classifications, behaviors, and background-noise level.",
  supportedTypes: ["ipv4"],
  capabilities: ["lookup", "enrich"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: [
    "CROWDSEC_API_KEY",
    "CROWDSEC_ENABLED",
    "CROWDSEC_RATE_LIMIT_PER_MINUTE",
  ],
  publicSubmissionPossible: false,
  warning:
    "CrowdSec's public CTI API is lookup-only. Submissions to the CrowdSec community blocklist come from CrowdSec agents, not from this app.",
  async getStatus() {
    const e = env();
    const configured = !!e.CROWDSEC_API_KEY;
    return {
      id: "crowdsec",
      enabled: e.CROWDSEC_ENABLED,
      configured,
      available: e.CROWDSEC_ENABLED && configured,
      reason: configured
        ? "API key set"
        : "Missing CROWDSEC_API_KEY (register at app.crowdsec.net)",
    };
  },
  lookup: crowdsecLookup,
  enrich: crowdsecLookup,
};
