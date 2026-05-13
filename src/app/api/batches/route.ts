import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, withErrorHandling } from "@/lib/api/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ListQuery = z.object({
  limit: z.coerce.number().int().positive().max(500).default(100),
  status: z
    .enum(["created", "processing", "completed", "all"])
    .default("all"),
});

export const GET = withErrorHandling("GET /api/batches", async (req: Request) => {
  const url = new URL(req.url);
  const parsed = ListQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return apiError("invalid query", 400, parsed.error.flatten());
  }
  const { limit, status } = parsed.data;

  const batches = await prisma.submissionBatch.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      mode: true,
      status: true,
      createdAt: true,
      totalCount: true,
      submittedCount: true,
      failedCount: true,
      skippedCount: true,
      selectedProviders: true,
    },
  });
  return NextResponse.json({ batches });
});
