import type { ProviderAdapter } from "./types";

import { urlhausProvider } from "./urlhaus";
import { urlscanProvider } from "./urlscan";
import { googleSafeBrowsingProvider } from "./google-safe-browsing";
import { googleWebRiskProvider } from "./google-web-risk";
import { abuseipdbProvider } from "./abuseipdb";
import { virustotalProvider } from "./virustotal";
import { mispProvider } from "./misp";
import { openctiProvider } from "./opencti";
import { phishtankProvider } from "./phishtank";
import { microsoftDefenderTiProvider } from "./microsoft-defender-ti";
import { crowdsecProvider } from "./crowdsec";
import { customWebFormProvider } from "./custom-web-form";

export const PROVIDERS: ProviderAdapter[] = [
  urlhausProvider,
  urlscanProvider,
  googleSafeBrowsingProvider,
  googleWebRiskProvider,
  abuseipdbProvider,
  crowdsecProvider,
  virustotalProvider,
  mispProvider,
  openctiProvider,
  phishtankProvider,
  microsoftDefenderTiProvider,
  customWebFormProvider,
];

const PROVIDER_MAP: Record<string, ProviderAdapter> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p])
);

export function getProvider(id: string): ProviderAdapter | undefined {
  return PROVIDER_MAP[id];
}

export function listProviders(): ProviderAdapter[] {
  return PROVIDERS;
}
