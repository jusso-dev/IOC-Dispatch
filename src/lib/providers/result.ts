import type { ProviderSubmissionResult } from "./types";

type Extras = Omit<ProviderSubmissionResult, "providerId" | "status">;

export function success(providerId: string, extras: Extras = {}): ProviderSubmissionResult {
  return { providerId, status: "success", ...extras };
}

export function failed(
  providerId: string,
  message: string,
  raw?: unknown,
  extras: Omit<Extras, "raw" | "message"> = {}
): ProviderSubmissionResult {
  return { providerId, status: "failed", message, raw, ...extras };
}

export function disabled(providerId: string, reason: string): ProviderSubmissionResult {
  return { providerId, status: "disabled", message: reason };
}

export function unsupported(providerId: string, reason: string): ProviderSubmissionResult {
  return { providerId, status: "unsupported", message: reason };
}

export function rateLimited(
  providerId: string,
  scope: "local" | "remote" = "local",
  detail?: string
): ProviderSubmissionResult {
  return {
    providerId,
    status: "rate_limited",
    message: `${scope} rate limit${detail ? `: ${detail}` : ""}`,
  };
}

export function manualRequired(providerId: string, reason: string): ProviderSubmissionResult {
  return { providerId, status: "manual_required", message: reason };
}
