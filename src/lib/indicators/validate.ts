/** Strict IPv4 — four decimal octets 0-255, no leading zeros (except 0). */
export function isValidIPv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return false;
    const n = parseInt(p, 10);
    if (n < 0 || n > 255) return false;
  }
  return true;
}

const HEX_32 = /^[a-f0-9]{32}$/i;
const HEX_40 = /^[a-f0-9]{40}$/i;
const HEX_64 = /^[a-f0-9]{64}$/i;

export function isMd5(value: string): boolean {
  return HEX_32.test(value);
}

export function isSha1(value: string): boolean {
  return HEX_40.test(value);
}

export function isSha256(value: string): boolean {
  return HEX_64.test(value);
}

// Conservative email pattern. Not full RFC, intentionally strict for IOC ingestion.
const EMAIL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

// Domain-ish: labels separated by dots, last label has 2+ letters.
const DOMAIN_RE =
  /^(?=.{1,253}$)(?!-)([A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;

export function isDomain(value: string): boolean {
  return DOMAIN_RE.test(value);
}

export const UNSAFE_URL_SCHEMES = new Set([
  "javascript:",
  "data:",
  "file:",
  "vbscript:",
  "blob:",
  "ftp:",
]);

export function isSupportedUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (UNSAFE_URL_SCHEMES.has(u.protocol)) return false;
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
