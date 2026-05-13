import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { parseIndicators } from "@/lib/indicators/parse";
import { apiError, readJson, withErrorHandling } from "@/lib/api/handler";
import { createSubmissionBatch } from "@/server/submissions/create-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2_000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).default([]),
  mode: z.enum(["lookup", "submit", "dry_run"]),
  selectedProviderIds: z
    .array(z.string().min(1).max(64))
    .min(1, "select at least one provider")
    .max(32),
  input: z.string().min(1).max(1_000_000),
  confirmed: z.literal(true, {
    errorMap: () => ({ message: "submission must be explicitly confirmed" }),
  }),
});

export const POST = withErrorHandling("POST /api/submit", async (req: Request) => {
  const parsed = await readJson(req, Body);
  if (!parsed.ok) return parsed.response;

  const max = env().MAX_INDICATORS_PER_BATCH;
  const all = parseIndicators(parsed.value.input);
  const indicators = all.slice(0, max);
  if (!indicators.length) {
    return apiError("no parsable indicators in input", 400);
  }

  const summary = await createSubmissionBatch({
    name: parsed.value.name,
    notes: parsed.value.notes,
    tags: parsed.value.tags,
    mode: parsed.value.mode,
    selectedProviderIds: parsed.value.selectedProviderIds,
    indicators,
  });

  return NextResponse.json({
    ...summary,
    truncated: all.length > indicators.length,
    truncatedCount: Math.max(0, all.length - indicators.length),
  });
});
