import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, assertValidId, withErrorHandling } from "@/lib/api/handler";
import type { IndicatorType } from "@/lib/indicators/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FormatSchema = z.enum(["json", "csv", "txt", "misp", "stix"]).default("json");

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandling(
  "GET /api/batches/[id]/export",
  async (req: Request, ctx: RouteCtx) => {
    const { id } = await ctx.params;
    if (!assertValidId(id)) return apiError("invalid batch id", 400);

    const url = new URL(req.url);
    const fmt = FormatSchema.safeParse(
      (url.searchParams.get("format") ?? "json").toLowerCase()
    );
    if (!fmt.success) {
      return apiError("invalid format (expected json|csv|txt|misp|stix)", 400);
    }
    const format = fmt.data;

    const batch = await prisma.submissionBatch.findUnique({
      where: { id },
      include: {
        indicators: {
          include: { attempts: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!batch) return apiError("batch not found", 404);

    if (format === "txt") {
      const body = batch.indicators.map((i) => i.normalizedValue).join("\n");
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="batch-${id}.txt"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "csv") {
      const rows = batch.indicators.map((i) => ({
        original: i.originalValue,
        normalized: i.normalizedValue,
        type: i.type,
        status: i.status,
        warning: i.warning ?? "",
      }));
      return new NextResponse(toCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="batch-${id}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "misp") {
      const event = {
        Event: {
          info: batch.name ?? `IntelRelay batch ${batch.id}`,
          distribution: "0",
          threat_level_id: "3",
          analysis: "0",
          Attribute: batch.indicators
            .filter((i) => i.status === "parsed" || i.status === "submitted")
            .map((i) => ({
              type: mispType(i.type as IndicatorType),
              category: mispCategory(i.type as IndicatorType),
              value: i.normalizedValue,
              to_ids: true,
              comment: i.warning ?? "",
            })),
        },
      };
      return NextResponse.json(event, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (format === "stix") {
      const now = new Date().toISOString();
      const bundle = {
        type: "bundle",
        id: `bundle--${randomUUID()}`,
        objects: batch.indicators.map((i) => ({
          type: "indicator",
          spec_version: "2.1",
          id: `indicator--${randomUUID()}`,
          created: now,
          modified: now,
          name: i.normalizedValue,
          pattern_type: "stix",
          pattern: stixPattern(i.type as IndicatorType, i.normalizedValue),
          valid_from: now,
          indicator_types: ["malicious-activity"],
        })),
      };
      return NextResponse.json(bundle, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ batch }, { headers: { "Cache-Control": "no-store" } });
  }
);

function toCsv(rows: Array<Record<string, string>>): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c] ?? "")).join(",")),
  ].join("\n");
}

function mispType(t: IndicatorType): string {
  switch (t) {
    case "url":
      return "url";
    case "domain":
      return "domain";
    case "ipv4":
      return "ip-dst";
    case "md5":
      return "md5";
    case "sha1":
      return "sha1";
    case "sha256":
      return "sha256";
    case "email":
      return "email-src";
    default:
      return "other";
  }
}

function mispCategory(t: IndicatorType): string {
  if (["url", "domain", "ipv4"].includes(t)) return "Network activity";
  if (["md5", "sha1", "sha256"].includes(t)) return "Payload delivery";
  if (t === "email") return "Targeting data";
  return "Other";
}

function stixPattern(t: IndicatorType, v: string): string {
  const esc = v.replace(/'/g, "\\'");
  switch (t) {
    case "url":
      return `[url:value = '${esc}']`;
    case "domain":
      return `[domain-name:value = '${esc}']`;
    case "ipv4":
      return `[ipv4-addr:value = '${esc}']`;
    case "md5":
      return `[file:hashes.MD5 = '${esc}']`;
    case "sha1":
      return `[file:hashes.'SHA-1' = '${esc}']`;
    case "sha256":
      return `[file:hashes.'SHA-256' = '${esc}']`;
    case "email":
      return `[email-addr:value = '${esc}']`;
    default:
      return `[x-intelrelay-unknown:value = '${esc}']`;
  }
}
