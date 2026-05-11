import { describe, expect, it } from "vitest";
import { getEligibleProviderActions } from "./routing";
import type { ParsedIndicator } from "@/lib/indicators/types";

function ind(
  type: ParsedIndicator["type"],
  value: string
): ParsedIndicator {
  return {
    originalValue: value,
    normalizedValue: value,
    type,
    status: "parsed",
  };
}

describe("routing", () => {
  it("URLhaus only takes URL", () => {
    const plans = getEligibleProviderActions(ind("ipv4", "8.8.8.8"), {
      selectedProviderIds: ["urlhaus", "abuseipdb"],
      mode: "submit",
    });
    const urlhaus = plans.find((p) => p.providerId === "urlhaus")!;
    expect(urlhaus.action).toBe("skip");
    const abuse = plans.find((p) => p.providerId === "abuseipdb")!;
    expect(abuse.action).not.toBe("skip");
  });

  it("AbuseIPDB only takes IPv4", () => {
    const plans = getEligibleProviderActions(
      ind("url", "http://bad.example/a"),
      {
        selectedProviderIds: ["urlhaus", "abuseipdb"],
        mode: "submit",
      }
    );
    expect(plans.find((p) => p.providerId === "urlhaus")!.action).toBe(
      "submit"
    );
    expect(plans.find((p) => p.providerId === "abuseipdb")!.action).toBe(
      "skip"
    );
  });

  it("VT lookup mode prefers lookup", () => {
    const plans = getEligibleProviderActions(
      ind("sha256", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
      { selectedProviderIds: ["virustotal"], mode: "lookup" }
    );
    expect(plans[0].action).toBe("lookup");
  });

  it("Safe Browsing submit mode is skipped (lookup only)", () => {
    const plans = getEligibleProviderActions(
      ind("url", "http://bad.example/a"),
      { selectedProviderIds: ["google_safe_browsing"], mode: "submit" }
    );
    expect(plans[0].action).toBe("skip");
  });

  it("Safe Browsing lookup mode is allowed", () => {
    const plans = getEligibleProviderActions(
      ind("url", "http://bad.example/a"),
      { selectedProviderIds: ["google_safe_browsing"], mode: "lookup" }
    );
    expect(plans[0].action).toBe("lookup");
  });

  it("URLhaus never gets hash", () => {
    const plans = getEligibleProviderActions(
      ind("md5", "44d88612fea8a8f36de82e1278abb02f"),
      { selectedProviderIds: ["urlhaus", "virustotal"], mode: "submit" }
    );
    expect(plans.find((p) => p.providerId === "urlhaus")!.action).toBe("skip");
    expect(
      plans.find((p) => p.providerId === "virustotal")!.action
    ).not.toBe("skip");
  });

  it("MISP accepts email", () => {
    const plans = getEligibleProviderActions(ind("email", "a@b.com"), {
      selectedProviderIds: ["misp", "urlhaus"],
      mode: "submit",
    });
    expect(plans.find((p) => p.providerId === "misp")!.action).toBe("submit");
    expect(plans.find((p) => p.providerId === "urlhaus")!.action).toBe("skip");
  });

  it("CrowdSec accepts IPv4 lookup, rejects URL", () => {
    const ipPlans = getEligibleProviderActions(ind("ipv4", "1.2.3.4"), {
      selectedProviderIds: ["crowdsec"],
      mode: "lookup",
    });
    expect(ipPlans[0].action).toBe("lookup");
    const urlPlans = getEligibleProviderActions(
      ind("url", "http://bad.example"),
      { selectedProviderIds: ["crowdsec"], mode: "lookup" }
    );
    expect(urlPlans[0].action).toBe("skip");
  });

  it("CrowdSec submit-mode falls through (no submit capability)", () => {
    const plans = getEligibleProviderActions(ind("ipv4", "1.2.3.4"), {
      selectedProviderIds: ["crowdsec"],
      mode: "submit",
    });
    expect(plans[0].action).toBe("skip");
  });

  it("Unsupported indicator is skipped", () => {
    const plans = getEligibleProviderActions(
      { ...ind("unknown", "??"), status: "unsupported" },
      { selectedProviderIds: ["misp", "virustotal"], mode: "submit" }
    );
    expect(plans[0].action).toBe("skip");
  });
});
