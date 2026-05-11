import type { IndicatorType, ParsedIndicator } from "@/lib/indicators/types";

export type ProviderCapability =
  | "submit"
  | "scan"
  | "lookup"
  | "enrich"
  | "report"
  | "export"
  | "manual_required";

export type ProviderTransport = "api" | "playwright" | "manual";

export type SubmissionMode = "lookup" | "submit" | "dry_run";

export interface ProviderStatus {
  id: string;
  available: boolean;
  configured: boolean;
  enabled: boolean;
  reason?: string;
  lastCheckedAt?: string;
  message?: string;
}

export interface ProviderSubmissionInput {
  indicator: ParsedIndicator;
  action: ProviderCapability;
  mode: SubmissionMode;
  tags?: string[];
  comment?: string;
  extra?: Record<string, unknown>;
}

export type ProviderResultStatus =
  | "success"
  | "failed"
  | "skipped"
  | "rate_limited"
  | "manual_required"
  | "unsupported"
  | "disabled";

export interface ProviderSubmissionResult {
  providerId: string;
  status: ProviderResultStatus;
  externalId?: string;
  externalUrl?: string;
  message?: string;
  raw?: unknown;
  redactedRequest?: unknown;
}

export interface ProviderAdapter {
  id: string;
  name: string;
  description: string;
  supportedTypes: IndicatorType[];
  capabilities: ProviderCapability[];
  preferredTransport: ProviderTransport;
  availableTransports: ProviderTransport[];
  requiresApiKey: boolean;
  requiresLogin: boolean;
  envVars: string[];
  publicSubmissionPossible: boolean;
  warning?: string;

  getStatus(): Promise<ProviderStatus>;

  submit?(input: ProviderSubmissionInput): Promise<ProviderSubmissionResult>;
  lookup?(input: ProviderSubmissionInput): Promise<ProviderSubmissionResult>;
  scan?(input: ProviderSubmissionInput): Promise<ProviderSubmissionResult>;
  report?(input: ProviderSubmissionInput): Promise<ProviderSubmissionResult>;
  enrich?(input: ProviderSubmissionInput): Promise<ProviderSubmissionResult>;
}

export interface ProviderActionPlan {
  providerId: string | null;
  action: ProviderCapability | "skip";
  transport: ProviderTransport;
  reason: string;
}
