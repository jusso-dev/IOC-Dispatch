import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const batches = await prisma.submissionBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
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
}
