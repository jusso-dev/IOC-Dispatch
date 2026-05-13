import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { moduleLogger } from "@/lib/logger";

const log = moduleLogger("api");

export interface ApiError {
  error: string;
  details?: unknown;
}

/** RFC-friendly JSON error response. */
export function apiError(
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Parse a request body as JSON. Returns a typed result instead of throwing so
 * callers can decide how to surface bad input.
 */
export async function readJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<
  | { ok: true; value: z.output<S> }
  | { ok: false; response: NextResponse<ApiError> }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: apiError("invalid JSON body", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError("invalid request", 400, parsed.error.flatten()),
    };
  }
  return { ok: true, value: parsed.data };
}

/**
 * Wraps a route handler so unexpected exceptions become a uniform 500 instead
 * of leaking a stack trace. Zod errors are surfaced as 400 with field details.
 */
export function withErrorHandling<Args extends unknown[]>(
  name: string,
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return apiError("invalid request", 400, err.flatten());
      }
      log.error(`${name} failed`, { err });
      return apiError("internal server error", 500);
    }
  };
}

/** Lightweight cuid-ish check — keep loose; Prisma will hard-fail on misuse. */
const CUID_RE = /^[a-z0-9]{16,32}$/i;

export function assertValidId(id: string | undefined): id is string {
  return typeof id === "string" && CUID_RE.test(id);
}
