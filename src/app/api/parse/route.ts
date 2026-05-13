import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { parseIndicators } from "@/lib/indicators/parse";
import { readJson, withErrorHandling } from "@/lib/api/handler";
import { getEligibleProviderActions } from "@/server/submissions/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  input: z.string().min(1).max(1_000_000),
  selectedProviderIds: z
    .array(z.string().min(1).max(64))
    .max(32)
    .default([]),
  mode: z.enum(["lookup", "submit", "dry_run"]).default("lookup"),
});

export const POST = withErrorHandling("POST /api/parse", async (req: Request) => {
  const parsed = await readJson(req, Body);
  if (!parsed.ok) return parsed.response;

  const max = env().MAX_INDICATORS_PER_BATCH;
  const all = parseIndicators(parsed.value.input);
  const indicators = all.slice(0, max);

  const rows = indicators.map((indicator) => ({
    indicator,
    plan: getEligibleProviderActions(indicator, {
      selectedProviderIds: parsed.value.selectedProviderIds,
      mode: parsed.value.mode,
    }),
  }));

  return NextResponse.json({
    count: indicators.length,
    truncated: all.length > indicators.length,
    truncatedCount: Math.max(0, all.length - indicators.length),
    rows,
  });
});
