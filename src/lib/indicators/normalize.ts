/** Trim wrapping quotes, surrounding whitespace, and a leading `defang` style. */
export function stripWrapping(input: string): string {
  let v = input.trim();
  // Common defang refangs: hxxp -> http, [.] -> ., (.) -> .
  v = v
    .replace(/^hxxps?:\/\//i, (m) => m.replace(/x/gi, "t"))
    .replace(/\[\.\]/g, ".")
    .replace(/\(\.\)/g, ".")
    .replace(/\[dot\]/gi, ".")
    .replace(/\[:\]/g, ":");
  // strip wrapping quotes/angle brackets
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith("<") && v.endsWith(">"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function normalizeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    // Lowercase host but preserve everything else.
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return null;
  }
}

export function normalizeDomainToUrl(domainLike: string): string {
  // Accepts "example.com" or "example.com/path?x=1".
  const withScheme = `https://${domainLike}`;
  const u = new URL(withScheme);
  u.hostname = u.hostname.toLowerCase();
  return u.toString();
}

export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function normalizeHash(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
