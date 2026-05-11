import { NextResponse } from "next/server";
import { z } from "zod";
import { parseIndicators } from "@/lib/indicators/parse";
import { getEligibleProviderActions } from "@/server/submissions/routing";
import type { SubmissionMode } from "@/lib/providers/types";
import { env } from "@/lib/env";

const Body = z.object({
  input: z.string().min(1),
  selectedProviderIds: z.array(z.string()).default([]),
  mode: z.enum(["lookup", "submit", "dry_run"]).default("lookup"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const max = env().MAX_INDICATORS_PER_BATCH;
  const indicators = parseIndicators(parsed.data.input).slice(0, max);
  const mode = parsed.data.mode as SubmissionMode;

  const previewRows = indicators.map((ind) => {
    const plan = getEligibleProviderActions(ind, {
      selectedProviderIds: parsed.data.selectedProviderIds,
      mode,
    });
    return {
      indicator: ind,
      plan,
    };
  });

  return NextResponse.json({
    count: indicators.length,
    truncated: indicators.length === max,
    rows: previewRows,
  });
}
