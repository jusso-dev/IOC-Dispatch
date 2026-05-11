import { env } from "@/lib/env";
import {
  disabled,
  failed,
  manualRequired,
  success,
} from "@/lib/providers/result";
import type {
  ProviderSubmissionInput,
  ProviderSubmissionResult,
} from "@/lib/providers/types";
import { runPlaywrightJob } from "@/lib/providers/playwright/browser";
import { detectCaptcha } from "@/lib/providers/playwright/helpers";
import type { CustomWebFormConfig } from "@/lib/providers/playwright/types";

const ID = "custom_web_form";

export function parseCustomFormConfig(): CustomWebFormConfig | null {
  const raw = env().CUSTOM_WEB_FORM_CONFIG_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CustomWebFormConfig;
    if (!parsed.submissionUrl || !parsed.indicatorFieldSelector || !parsed.submitReportSelector) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function customWebFormSubmit(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.PLAYWRIGHT_ENABLED) return disabled(ID, "PLAYWRIGHT_ENABLED=false");
  if (!e.CUSTOM_WEB_FORM_ENABLED)
    return disabled(ID, "CUSTOM_WEB_FORM_ENABLED=false");

  const cfg = parseCustomFormConfig();
  if (!cfg)
    return disabled(ID, "CUSTOM_WEB_FORM_CONFIG_JSON missing or invalid");

  if (input.mode === "dry_run") {
    return success(ID, {
      message: "dry run (Playwright)",
      raw: { providerName: cfg.providerName, value: input.indicator.normalizedValue },
    });
  }

  return runPlaywrightJob(ID, async (page) => {
    try {
      if (cfg.loginUrl && cfg.usernameSelector && cfg.passwordSelector) {
        if (!e.CUSTOM_WEB_FORM_USERNAME || !e.CUSTOM_WEB_FORM_PASSWORD) {
          return disabled(ID, "Missing username/password env");
        }
        await page.goto(cfg.loginUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if (await detectCaptcha(page, cfg.captchaSelectors)) {
          return manualRequired(ID, "Login page presents CAPTCHA");
        }
        await page.fill(cfg.usernameSelector, e.CUSTOM_WEB_FORM_USERNAME);
        await page.fill(cfg.passwordSelector, e.CUSTOM_WEB_FORM_PASSWORD);
        if (cfg.submitLoginSelector) {
          await Promise.all([
            page.waitForLoadState("domcontentloaded"),
            page.click(cfg.submitLoginSelector),
          ]);
        }
      }

      await page.goto(cfg.submissionUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (await detectCaptcha(page, cfg.captchaSelectors)) {
        return manualRequired(ID, "Submission page presents CAPTCHA");
      }

      if (cfg.preSubmissionSelector) {
        await page.click(cfg.preSubmissionSelector);
      }

      await page.fill(cfg.indicatorFieldSelector, input.indicator.normalizedValue);
      if (cfg.commentFieldSelector && input.comment) {
        await page.fill(cfg.commentFieldSelector, input.comment);
      }

      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        page.click(cfg.submitReportSelector),
      ]);

      if (cfg.successSelector) {
        const ok = await page.locator(cfg.successSelector).count();
        if (ok > 0) return success(ID, { message: `Submitted to ${cfg.providerName}` });
      }
      if (cfg.failureSelector) {
        const bad = await page.locator(cfg.failureSelector).count();
        if (bad > 0) return failed(ID, "Provider returned failure indicator");
      }
      return success(ID, {
        message: `Submitted to ${cfg.providerName} (no explicit success selector matched)`,
      });
    } catch (err) {
      return failed(ID, (err as Error).message);
    }
  });
}
