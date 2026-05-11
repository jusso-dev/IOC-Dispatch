import { env } from "@/lib/env";
import type { ProviderAdapter } from "../types";
import { customWebFormSubmit, parseCustomFormConfig } from "./playwright";

export const customWebFormProvider: ProviderAdapter = {
  id: "custom_web_form",
  name: "Custom Web Form",
  description:
    "Generic Playwright submission for providers without an API. Admin-configurable.",
  supportedTypes: ["url", "domain", "ipv4", "md5", "sha1", "sha256", "email"],
  capabilities: ["submit"],
  preferredTransport: "playwright",
  availableTransports: ["playwright"],
  requiresApiKey: false,
  requiresLogin: true,
  envVars: [
    "CUSTOM_WEB_FORM_ENABLED",
    "CUSTOM_WEB_FORM_CONFIG_JSON",
    "CUSTOM_WEB_FORM_USERNAME",
    "CUSTOM_WEB_FORM_PASSWORD",
    "PLAYWRIGHT_ENABLED",
  ],
  publicSubmissionPossible: false,
  warning:
    "Browser automation is brittle. May break if the target site changes. Disabled by default.",
  async getStatus() {
    const e = env();
    const cfg = parseCustomFormConfig();
    const configured =
      !!cfg &&
      !!e.CUSTOM_WEB_FORM_USERNAME &&
      !!e.CUSTOM_WEB_FORM_PASSWORD;
    return {
      id: "custom_web_form",
      enabled: e.CUSTOM_WEB_FORM_ENABLED && e.PLAYWRIGHT_ENABLED,
      configured,
      available:
        e.CUSTOM_WEB_FORM_ENABLED && e.PLAYWRIGHT_ENABLED && configured,
      reason: cfg
        ? configured
          ? `Configured (${cfg.providerName})`
          : "Config present but credentials missing"
        : "No CUSTOM_WEB_FORM_CONFIG_JSON",
    };
  },
  submit: customWebFormSubmit,
};
