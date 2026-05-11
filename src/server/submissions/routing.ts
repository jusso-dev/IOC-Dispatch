import type { ParsedIndicator, IndicatorType } from "@/lib/indicators/types";
import { getProvider } from "@/lib/providers/registry";
import type {
  ProviderActionPlan,
  ProviderCapability,
  SubmissionMode,
} from "@/lib/providers/types";

interface RoutingContext {
  selectedProviderIds: string[];
  mode: SubmissionMode;
}

// Mode → preferred capability order for each provider.
function preferredAction(
  mode: SubmissionMode,
  caps: ProviderCapability[]
): ProviderCapability | null {
  const order: ProviderCapability[] =
    mode === "lookup"
      ? ["lookup", "enrich", "scan", "report", "submit", "export"]
      : ["submit", "report", "scan", "export", "lookup", "enrich"];
  for (const c of order) {
    if (caps.includes(c)) return c;
  }
  return null;
}

export function getEligibleProviderActions(
  indicator: ParsedIndicator,
  ctx: RoutingContext
): ProviderActionPlan[] {
  if (indicator.status !== "parsed") {
    return [
      {
        providerId: null,
        action: "skip",
        transport: "manual",
        reason: `Indicator status: ${indicator.status}`,
      },
    ];
  }

  const out: ProviderActionPlan[] = [];

  for (const id of ctx.selectedProviderIds) {
    const provider = getProvider(id);
    if (!provider) {
      out.push({
        providerId: id,
        action: "skip",
        transport: "manual",
        reason: "Provider not registered",
      });
      continue;
    }

    const type: IndicatorType = indicator.type;
    if (!provider.supportedTypes.includes(type)) {
      out.push({
        providerId: id,
        action: "skip",
        transport: "manual",
        reason: `Provider does not support ${type}`,
      });
      continue;
    }

    const action = preferredAction(ctx.mode, provider.capabilities);
    if (!action) {
      out.push({
        providerId: id,
        action: "skip",
        transport: provider.preferredTransport,
        reason: "No matching capability for this mode",
      });
      continue;
    }

    // If mode is submit but provider only supports lookup, treat as lookup or skip
    // depending on whether lookup is acceptable. Spec says Google SB should be
    // "unsupported or manual_required" if user picks submit.
    if (
      ctx.mode === "submit" &&
      !provider.capabilities.some((c) =>
        ["submit", "report", "scan", "export"].includes(c)
      )
    ) {
      out.push({
        providerId: id,
        action: "skip",
        transport: provider.preferredTransport,
        reason: `${provider.name} is lookup-only; cannot submit`,
      });
      continue;
    }

    out.push({
      providerId: id,
      action,
      transport: provider.preferredTransport,
      reason: `${type} → ${provider.name} ${action} (${provider.preferredTransport})`,
    });
  }

  if (out.every((p) => p.action === "skip")) {
    return out.length
      ? out
      : [
          {
            providerId: null,
            action: "skip",
            transport: "manual",
            reason: "No configured provider supports this indicator type",
          },
        ];
  }
  return out;
}
