import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { mispSubmit } from "./api";

export const mispProvider: ProviderAdapter = {
  id: "misp",
  name: "MISP",
  description:
    "Push attributes into a MISP event. Configure base URL + API key. Does not publish by default.",
  supportedTypes: ["url", "domain", "ipv4", "md5", "sha1", "sha256", "email"],
  capabilities: ["submit", "export"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: ["MISP_BASE_URL", "MISP_API_KEY", "MISP_VERIFY_TLS", "MISP_ENABLED"],
  publicSubmissionPossible: false,
  warning:
    "Distribution is org-controlled. Events are NOT published automatically.",
  async getStatus() {
    const e = env();
    const configured = !!e.MISP_BASE_URL && !!e.MISP_API_KEY;
    return {
      id: "misp",
      enabled: e.MISP_ENABLED,
      configured,
      available: e.MISP_ENABLED && configured,
      reason: configured ? "Base URL + key set" : "Missing MISP config",
    };
  },
  submit: mispSubmit,
};
