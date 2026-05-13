import { prisma } from "@/lib/db";
import { moduleLogger } from "@/lib/logger";
import { getProvider } from "@/lib/providers/registry";
import type {
  ProviderAdapter,
  ProviderCapability,
  ProviderSubmissionInput,
  ProviderSubmissionResult,
  SubmissionMode,
} from "@/lib/providers/types";
import type { IndicatorStatus, IndicatorType } from "@/lib/indicators/types";

const log = moduleLogger("process-attempt");

interface ProcessOpts {
  allowPlaywright: boolean;
  /** When true, skip the idempotency guard. Use only for explicit retries. */
  force?: boolean;
}

/**
 * Execute a single planned provider attempt. Idempotent: an attempt already
 * marked terminal (anything other than `pending`) is left untouched unless
 * `force` is set, so a duplicate BullMQ delivery cannot double-submit to a
 * remote provider.
 */
export async function processProviderAttempt(
  attemptId: string,
  opts: ProcessOpts
): Promise<void> {
  const attempt = await prisma.providerAttempt.findUnique({
    where: { id: attemptId },
    include: { indicator: { include: { batch: true } } },
  });
  if (!attempt) {
    log.warn("attempt not found", { attemptId });
    return;
  }

  if (!opts.force && attempt.status !== "pending") {
    log.debug("attempt already terminal — skipping", {
      attemptId,
      status: attempt.status,
    });
    return;
  }

  const provider = getProvider(attempt.providerId);
  if (!provider) {
    await markFailed(attemptId, `Provider not registered: ${attempt.providerId}`);
    return;
  }

  if (attempt.transport === "playwright" && !opts.allowPlaywright) {
    await prisma.providerAttempt.update({
      where: { id: attemptId },
      data: {
        status: "skipped",
        errorMessage: "Playwright disallowed in this worker",
        completedAt: new Date(),
      },
    });
    return;
  }

  const input: ProviderSubmissionInput = {
    indicator: {
      originalValue: attempt.indicator.originalValue,
      normalizedValue: attempt.indicator.normalizedValue,
      type: attempt.indicator.type as IndicatorType,
      status: attempt.indicator.status as IndicatorStatus,
      warning: attempt.indicator.warning ?? undefined,
    },
    action: attempt.action as ProviderCapability,
    mode: attempt.indicator.batch.mode as SubmissionMode,
    tags: attempt.indicator.batch.tags,
    comment: attempt.indicator.batch.notes ?? undefined,
  };

  let result: ProviderSubmissionResult;
  try {
    result = await callProvider(provider, input.action, input);
  } catch (err) {
    log.error("provider threw", {
      providerId: provider.id,
      attemptId,
      err,
    });
    result = {
      providerId: provider.id,
      status: "failed",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  await prisma.providerAttempt.update({
    where: { id: attemptId },
    data: {
      status: result.status,
      requestPayload: serializeJson(result.redactedRequest),
      responsePayload: serializeJson(result.raw),
      externalId: result.externalId ?? null,
      externalUrl: result.externalUrl ?? null,
      // `errorMessage` doubles as a status message — populated on success
      // (e.g. "not in corpus") and failure ("HTTP 401: forbidden"). UI tones
      // it based on the attempt `status`.
      errorMessage: result.message ?? null,
      completedAt: new Date(),
      screenshotPath: extractScreenshot(result.raw),
    },
  });

  await rollupIndicatorStatus(attempt.indicatorId);
}

function serializeJson(value: unknown): object | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") return { value };
  return value as object;
}

function extractScreenshot(raw: unknown): string | undefined {
  if (raw && typeof raw === "object" && "screenshotPath" in raw) {
    const v = (raw as { screenshotPath?: unknown }).screenshotPath;
    if (typeof v === "string") return v;
  }
  return undefined;
}

async function callProvider(
  provider: ProviderAdapter,
  action: ProviderCapability,
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  switch (action) {
    case "submit":
      if (provider.submit) return provider.submit(input);
      break;
    case "lookup":
      if (provider.lookup) return provider.lookup(input);
      break;
    case "scan":
      if (provider.scan) return provider.scan(input);
      break;
    case "report":
      if (provider.report) return provider.report(input);
      break;
    case "enrich":
      if (provider.enrich) return provider.enrich(input);
      break;
    case "export":
    case "manual_required":
      return {
        providerId: provider.id,
        status: "manual_required",
        message: `Action ${action} requires manual handling`,
      };
  }
  return {
    providerId: provider.id,
    status: "unsupported",
    message: `Provider ${provider.id} does not implement ${action}`,
  };
}

async function markFailed(attemptId: string, message: string): Promise<void> {
  await prisma.providerAttempt.update({
    where: { id: attemptId },
    data: { status: "failed", errorMessage: message, completedAt: new Date() },
  });
}

async function rollupIndicatorStatus(indicatorId: string): Promise<void> {
  const attempts = await prisma.providerAttempt.findMany({
    where: { indicatorId },
    select: { status: true },
  });
  if (!attempts.length) return;

  const anyPending = attempts.some((a) => a.status === "pending");
  if (anyPending) return; // Wait for the rest to land before rolling up.

  const anySuccess = attempts.some((a) => a.status === "success");
  const anyFailed = attempts.some((a) =>
    ["failed", "rate_limited"].includes(a.status)
  );
  const allTerminal = attempts.every((a) =>
    ["unsupported", "disabled", "skipped", "manual_required"].includes(a.status)
  );

  let status: IndicatorStatus = "parsed";
  if (anySuccess) status = "submitted";
  else if (anyFailed) status = "failed";
  else if (allTerminal) status = "skipped";

  await prisma.submissionIndicator.update({
    where: { id: indicatorId },
    data: { status },
  });
}
