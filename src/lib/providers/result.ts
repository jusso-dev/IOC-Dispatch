import type { ProviderSubmissionResult } from "./types";

export function success(
  providerId: string,
  partial: Omit<ProviderSubmissionResult, "providerId" | "status"> = {}
): ProviderSubmissionResult {
  return { providerId, status: "success", ...partial };
}

export function failed(
  providerId: string,
  message: string,
  raw?: unknown
): ProviderSubmissionResult {
  return { providerId, status: "failed", message, raw };
}

export function disabled(
  providerId: string,
  reason: string
): ProviderSubmissionResult {
  return { providerId, status: "disabled", message: reason };
}

export function unsupported(
  providerId: string,
  reason: string
): ProviderSubmissionResult {
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

export function manualRequired(
  providerId: string,
  reason: string
): ProviderSubmissionResult {
  return { providerId, status: "manual_required", message: reason };
}
