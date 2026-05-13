import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, assertValidId, withErrorHandling } from "@/lib/api/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandling(
  "GET /api/batches/[id]",
  async (_req: Request, ctx: RouteCtx) => {
    const { id } = await ctx.params;
    if (!assertValidId(id)) return apiError("invalid batch id", 400);

    const batch = await prisma.submissionBatch.findUnique({
      where: { id },
      include: {
        indicators: {
          orderBy: { createdAt: "asc" },
          include: { attempts: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (!batch) return apiError("batch not found", 404);
    return NextResponse.json({ batch });
  }
);

export const DELETE = withErrorHandling(
  "DELETE /api/batches/[id]",
  async (_req: Request, ctx: RouteCtx) => {
    const { id } = await ctx.params;
    if (!assertValidId(id)) return apiError("invalid batch id", 400);

    try {
      await prisma.submissionBatch.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return apiError("batch not found", 404);
      }
      throw err;
    }
  }
);
