import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const batch = await prisma.submissionBatch.findUnique({
    where: { id },
    include: {
      indicators: {
        orderBy: { createdAt: "asc" },
        include: { attempts: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!batch) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ batch });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    await prisma.submissionBatch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
