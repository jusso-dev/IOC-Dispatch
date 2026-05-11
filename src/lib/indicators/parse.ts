import type { ParsedIndicator } from "./types";
import {
  isDomain,
  isEmail,
  isMd5,
  isSha1,
  isSha256,
  isSupportedUrl,
  isValidIPv4,
  UNSAFE_URL_SCHEMES,
} from "./validate";
import {
  normalizeDomain,
  normalizeDomainToUrl,
  normalizeEmail,
  normalizeHash,
  normalizeUrl,
  stripWrapping,
} from "./normalize";

const SPLIT_RE = /[\n,;\t]+|(?<=\S) +(?=\S)/;

function looksLikeUrl(raw: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(raw);
}

function classifyOne(input: string): ParsedIndicator {
  const original = input;
  let v = stripWrapping(input);

  if (!v) {
    return {
      originalValue: original,
      normalizedValue: original,
      type: "unknown",
      status: "skipped",
      warning: "Empty value",
    };
  }

  // Explicit URL scheme present
  if (looksLikeUrl(v)) {
    try {
      const u = new URL(v);
      if (UNSAFE_URL_SCHEMES.has(u.protocol) || (u.protocol !== "http:" && u.protocol !== "https:")) {
        return {
          originalValue: original,
          normalizedValue: v,
          type: "unknown",
          status: "unsupported",
          warning: `Unsupported URL scheme: ${u.protocol}`,
        };
      }
    } catch {
      return {
        originalValue: original,
        normalizedValue: v,
        type: "unknown",
        status: "unsupported",
        warning: "Malformed URL",
      };
    }
    if (isSupportedUrl(v)) {
      const norm = normalizeUrl(v)!;
      return {
        originalValue: original,
        normalizedValue: norm,
        type: "url",
        status: "parsed",
      };
    }
  }

  // IPv4 (strict). Reject if contains a port — let domain-ish/url path handle that.
  if (isValidIPv4(v)) {
    return {
      originalValue: original,
      normalizedValue: v,
      type: "ipv4",
      status: "parsed",
    };
  }

  // Hashes
  if (isSha256(v)) {
    return {
      originalValue: original,
      normalizedValue: normalizeHash(v),
      type: "sha256",
      status: "parsed",
    };
  }
  if (isSha1(v)) {
    return {
      originalValue: original,
      normalizedValue: normalizeHash(v),
      type: "sha1",
      status: "parsed",
    };
  }
  if (isMd5(v)) {
    return {
      originalValue: original,
      normalizedValue: normalizeHash(v),
      type: "md5",
      status: "parsed",
    };
  }

  // Email
  if (isEmail(v)) {
    return {
      originalValue: original,
      normalizedValue: normalizeEmail(v),
      type: "email",
      status: "parsed",
    };
  }

  // Domain-ish — bare host or host with path. Try normalizing to https URL.
  const beforeSlash = v.split("/")[0];
  if (isDomain(beforeSlash)) {
    if (v.includes("/") || v.includes("?")) {
      try {
        const url = normalizeDomainToUrl(v);
        return {
          originalValue: original,
          normalizedValue: url,
          type: "url",
          status: "parsed",
          warning: "Domain-like input normalized to https URL",
        };
      } catch {
        // fall through
      }
    }
    return {
      originalValue: original,
      normalizedValue: normalizeDomain(v),
      type: "domain",
      status: "parsed",
    };
  }

  return {
    originalValue: original,
    normalizedValue: v,
    type: "unknown",
    status: "unsupported",
    warning: "Invalid indicator",
  };
}

/**
 * Parse a free-text blob of indicators. Splits on newlines/commas/semicolons/tabs and
 * single spaces between non-empty tokens. Deduplicates by normalized value+type.
 */
export function parseIndicators(input: string): ParsedIndicator[] {
  if (!input) return [];
  const tokens = input.split(SPLIT_RE).map((t) => t.trim()).filter(Boolean);
  const out: ParsedIndicator[] = [];
  const seen = new Map<string, number>();
  for (const tok of tokens) {
    const parsed = classifyOne(tok);
    const key = `${parsed.type}:${parsed.normalizedValue}`;
    if (seen.has(key)) {
      out.push({
        ...parsed,
        status: "skipped",
        warning: parsed.warning ?? "Duplicate removed",
      });
      continue;
    }
    seen.set(key, out.length);
    out.push(parsed);
  }
  return out;
}
