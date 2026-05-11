import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { openctiSubmit } from "./api";

export const openctiProvider: ProviderAdapter = {
  id: "opencti",
  name: "OpenCTI",
  description:
    "Create indicators/observables in OpenCTI via GraphQL. Disabled by default.",
  supportedTypes: ["url", "domain", "ipv4", "md5", "sha1", "sha256", "email"],
  capabilities: ["submit", "enrich"],
  preferredTransport: "api",
  availableTransports: ["api"],
  requiresApiKey: true,
  requiresLogin: false,
  envVars: ["OPENCTI_BASE_URL", "OPENCTI_API_KEY", "OPENCTI_ENABLED"],
  publicSubmissionPossible: false,
  async getStatus() {
    const e = env();
    const configured = !!e.OPENCTI_BASE_URL && !!e.OPENCTI_API_KEY;
    return {
      id: "opencti",
      enabled: e.OPENCTI_ENABLED,
      configured,
      available: e.OPENCTI_ENABLED && configured,
      reason: configured ? "Base URL + key set" : "Missing OpenCTI config",
    };
  },
  submit: openctiSubmit,
};
