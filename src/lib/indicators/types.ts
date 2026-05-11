export type IndicatorType =
  | "ipv4"
  | "url"
  | "domain"
  | "sha256"
  | "sha1"
  | "md5"
  | "email"
  | "unknown";

export type IndicatorStatus =
  | "parsed"
  | "skipped"
  | "submitted"
  | "failed"
  | "unsupported";

export interface ParsedIndicator {
  originalValue: string;
  normalizedValue: string;
  type: IndicatorType;
  status: IndicatorStatus;
  warning?: string;
}

export const INDICATOR_TYPE_LABELS: Record<IndicatorType, string> = {
  ipv4: "IPv4",
  url: "URL",
  domain: "Domain",
  sha256: "SHA256",
  sha1: "SHA1",
  md5: "MD5",
  email: "Email",
  unknown: "Unknown",
};
