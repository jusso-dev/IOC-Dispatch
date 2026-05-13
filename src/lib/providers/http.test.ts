import { describe, expect, it } from "vitest";
import { redact } from "./http";

describe("redact", () => {
  it("redacts top-level secret keys (case-insensitive)", () => {
    const out = redact({
      Authorization: "Bearer abc123",
      "API-Key": "secret",
      data: { value: "ok" },
    });
    expect(out.Authorization).toBe("[REDACTED]");
    expect(out["API-Key"]).toBe("[REDACTED]");
    expect((out.data as { value: string }).value).toBe("ok");
  });

  it("recurses into nested objects", () => {
    const out = redact({
      meta: { headers: { authorization: "Bearer xyz" } },
    }) as Record<string, Record<string, Record<string, string>>>;
    expect(out.meta.headers.authorization).toBe("[REDACTED]");
  });

  it("redacts bearer-shaped strings even when the key is not in the denylist", () => {
    const out = redact({ note: "Bearer eyJhbGciOiJIUzI1NiJ9" });
    expect(out.note).toBe("[REDACTED]");
  });

  it("honors extra keys", () => {
    const out = redact({ session: "abc" }, ["session"]);
    expect(out.session).toBe("[REDACTED]");
  });

  it("preserves non-string scalars", () => {
    const out = redact({ count: 3, ok: true });
    expect(out.count).toBe(3);
    expect(out.ok).toBe(true);
  });

  it("walks arrays", () => {
    const out = redact({
      tokens: [{ token: "a" }, { token: "b" }],
    }) as { tokens: Array<{ token: string }> };
    expect(out.tokens[0].token).toBe("[REDACTED]");
    expect(out.tokens[1].token).toBe("[REDACTED]");
  });
});
