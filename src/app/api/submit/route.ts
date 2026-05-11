import { NextResponse } from "next/server";
import { z } from "zod";
import { parseIndicators } from "@/lib/indicators/parse";
import { createSubmissionBatch } from "@/server/submissions/create-batch";
import { env } from "@/lib/env";

const Body = z.object({
  name: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  mode: z.enum(["lookup", "submit", "dry_run"]),
  selectedProviderIds: z.array(z.string()).default([]),
  input: z.string().min(1),
  confirmed: z.boolean(),
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

  if (!parsed.data.confirmed) {
    return NextResponse.json(
      { error: "Submission not confirmed" },
      { status: 400 }
    );
  }

  const max = env().MAX_INDICATORS_PER_BATCH;
  const indicators = parseIndicators(parsed.data.input).slice(0, max);
  if (!indicators.length) {
    return NextResponse.json({ error: "No indicators parsed" }, { status: 400 });
  }

  const summary = await createSubmissionBatch({
    name: parsed.data.name,
    notes: parsed.data.notes,
    tags: parsed.data.tags,
    mode: parsed.data.mode,
    selectedProviderIds: parsed.data.selectedProviderIds,
    indicators,
  });
  return NextResponse.json(summary);
}
