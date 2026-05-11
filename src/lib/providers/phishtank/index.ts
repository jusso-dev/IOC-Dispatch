import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { phishtankLookup } from "./api";
import { phishtankPlaywrightSubmit } from "./playwright";

export const phishtankProvider: ProviderAdapter = {
  id: "phishtank",
  name: "PhishTank",
  description:
    "Lookup via API. Optional Playwright submission (disabled by default; brittle, may trigger CAPTCHA).",
  supportedTypes: ["url"],
  capabilities: ["lookup", "submit", "manual_required"],
  preferredTransport: "api",
  availableTransports: ["api", "playwright", "manual"],
  requiresApiKey: false,
  requiresLogin: true,
  envVars: [
    "PHISHTANK_API_KEY",
    "PHISHTANK_ENABLED",
    "PHISHTANK_PLAYWRIGHT_ENABLED",
    "PHISHTANK_USERNAME",
    "PHISHTANK_PASSWORD",
  ],
  publicSubmissionPossible: true,
  warning:
    "Playwright submission is brittle and may fail at CAPTCHA. Will mark `manual_required` instead of bypassing.",
  async getStatus() {
    const e = env();
    const lookupOk = e.PHISHTANK_ENABLED;
    const pwOk =
      e.PLAYWRIGHT_ENABLED &&
      e.PHISHTANK_PLAYWRIGHT_ENABLED &&
      !!e.PHISHTANK_USERNAME &&
      !!e.PHISHTANK_PASSWORD;
    return {
      id: "phishtank",
      enabled: lookupOk || pwOk,
      configured: lookupOk || pwOk,
      available: lookupOk || pwOk,
      reason: pwOk
        ? "Lookup + Playwright submission enabled"
        : lookupOk
        ? "Lookup only"
        : "Disabled",
    };
  },
  lookup: phishtankLookup,
  submit: phishtankPlaywrightSubmit,
};
