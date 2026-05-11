import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers/registry";
import type {
  ProviderCapability,
  ProviderSubmissionInput,
  ProviderSubmissionResult,
  SubmissionMode,
} from "@/lib/providers/types";

interface ProcessOpts {
  allowPlaywright: boolean;
}

export async function processProviderAttempt(
  attemptId: string,
  opts: ProcessOpts
) {
  const attempt = await prisma.providerAttempt.findUnique({
    where: { id: attemptId },
    include: { indicator: { include: { batch: true } } },
  });
  if (!attempt) return;

  const provider = getProvider(attempt.providerId);
  if (!provider) {
    await markFailed(attemptId, "Provider not registered");
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

  const indicator = attempt.indicator;
  const batch = indicator.batch;

  const input: ProviderSubmissionInput = {
    indicator: {
      originalValue: indicator.originalValue,
      normalizedValue: indicator.normalizedValue,
      type: indicator.type as ProviderSubmissionInput["indicator"]["type"],
      status: indicator.status as ProviderSubmissionInput["indicator"]["status"],
      warning: indicator.warning ?? undefined,
    },
    action: attempt.action as ProviderCapability,
    mode: batch.mode as SubmissionMode,
    tags: batch.tags,
    comment: batch.notes ?? undefined,
  };

  let result: ProviderSubmissionResult;
  try {
    result = await callProvider(provider, attempt.action as ProviderCapability, input);
  } catch (err) {
    result = {
      providerId: provider.id,
      status: "failed",
      message: (err as Error).message,
    };
  }

  await prisma.providerAttempt.update({
    where: { id: attemptId },
    data: {
      status: result.status,
      requestPayload: (result.redactedRequest as object | undefined) ?? undefined,
      responsePayload: (result.raw as object | undefined) ?? undefined,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
      // `errorMessage` doubles as a status message — populated on success
      // (e.g. "not in corpus") and failure ("HTTP 401: forbidden"). UI tones
      // it based on the attempt `status`.
      errorMessage: result.message ?? null,
      completedAt: new Date(),
      screenshotPath: extractScreenshot(result.raw),
    },
  });

  // Roll up indicator status: success on any attempt = submitted.
  await rollupIndicatorStatus(indicator.id);
}

function extractScreenshot(raw: unknown): string | undefined {
  if (raw && typeof raw === "object" && "screenshotPath" in raw) {
    const v = (raw as { screenshotPath?: unknown }).screenshotPath;
    if (typeof v === "string") return v;
  }
  return undefined;
}

async function callProvider(
  provider: ReturnType<typeof getProvider> & object,
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

async function markFailed(attemptId: string, message: string) {
  await prisma.providerAttempt.update({
    where: { id: attemptId },
    data: { status: "failed", errorMessage: message, completedAt: new Date() },
  });
}

async function rollupIndicatorStatus(indicatorId: string) {
  const attempts = await prisma.providerAttempt.findMany({
    where: { indicatorId },
    select: { status: true },
  });
  if (!attempts.length) return;
  const anySuccess = attempts.some((a) => a.status === "success");
  const anyFailed = attempts.some((a) => a.status === "failed");
  const allUnsupported = attempts.every((a) =>
    ["unsupported", "disabled", "skipped", "manual_required"].includes(a.status)
  );

  let status: string = "parsed";
  if (anySuccess) status = "submitted";
  else if (anyFailed) status = "failed";
  else if (allUnsupported) status = "skipped";

  await prisma.submissionIndicator.update({
    where: { id: indicatorId },
    data: { status },
  });
}
