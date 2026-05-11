import { describe, expect, it } from "vitest";
import { parseIndicators } from "./parse";

describe("parseIndicators", () => {
  it("classifies valid IPv4", () => {
    const r = parseIndicators("8.8.8.8");
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe("ipv4");
    expect(r[0].status).toBe("parsed");
  });

  it("rejects invalid IPv4", () => {
    const r = parseIndicators("999.999.999.999");
    expect(r[0].type).toBe("unknown");
    expect(r[0].status).toBe("unsupported");
  });

  it("rejects partial IPv4", () => {
    const r = parseIndicators("1.2.3");
    expect(r[0].type).toBe("unknown");
  });

  it("parses http URL", () => {
    const r = parseIndicators("http://bad.example/a.exe");
    expect(r[0].type).toBe("url");
    expect(r[0].normalizedValue).toContain("bad.example");
  });

  it("parses https URL with query string", () => {
    const r = parseIndicators("https://evil.example/login?x=1");
    expect(r[0].type).toBe("url");
    expect(r[0].normalizedValue).toContain("x=1");
  });

  it("normalizes bare domain to https URL when path present", () => {
    const r = parseIndicators("example.com/path");
    expect(r[0].type).toBe("url");
    expect(r[0].normalizedValue).toBe("https://example.com/path");
    expect(r[0].warning).toMatch(/normalized/i);
  });

  it("keeps bare domain as domain", () => {
    const r = parseIndicators("example.com");
    expect(r[0].type).toBe("domain");
    expect(r[0].normalizedValue).toBe("example.com");
  });

  it("rejects javascript scheme", () => {
    const r = parseIndicators("javascript:alert(1)");
    expect(r[0].status).toBe("unsupported");
  });

  it("rejects file scheme", () => {
    const r = parseIndicators("file:///etc/passwd");
    expect(r[0].status).toBe("unsupported");
  });

  it("classifies md5", () => {
    const r = parseIndicators("44d88612fea8a8f36de82e1278abb02f");
    expect(r[0].type).toBe("md5");
  });

  it("classifies sha1", () => {
    const r = parseIndicators("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(r[0].type).toBe("sha1");
  });

  it("classifies sha256", () => {
    const r = parseIndicators(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    expect(r[0].type).toBe("sha256");
  });

  it("classifies email", () => {
    const r = parseIndicators("user@example.com");
    expect(r[0].type).toBe("email");
    expect(r[0].normalizedValue).toBe("user@example.com");
  });

  it("dedupes by normalized value", () => {
    const r = parseIndicators("8.8.8.8\n8.8.8.8");
    expect(r).toHaveLength(2);
    expect(r[1].status).toBe("skipped");
  });

  it("handles CSV-style input", () => {
    const r = parseIndicators("1.1.1.1, 2.2.2.2, 3.3.3.3");
    expect(r.filter((x) => x.type === "ipv4")).toHaveLength(3);
  });

  it("handles mixed input", () => {
    const input = [
      "http://bad.example/a.exe",
      "192.0.2.10",
      "44d88612fea8a8f36de82e1278abb02f",
      "user@example.com",
      "example.com",
    ].join("\n");
    const r = parseIndicators(input);
    expect(r.map((x) => x.type)).toEqual([
      "url",
      "ipv4",
      "md5",
      "email",
      "domain",
    ]);
  });

  it("ignores empty lines", () => {
    const r = parseIndicators("\n\n8.8.8.8\n\n");
    expect(r).toHaveLength(1);
  });

  it("refangs defanged URLs", () => {
    const r = parseIndicators("hxxp://bad[.]example/a");
    expect(r[0].type).toBe("url");
    expect(r[0].normalizedValue).toContain("http://bad.example");
  });
});
