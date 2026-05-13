import { env } from "@/lib/env";
import {
  disabled,
  failed,
  manualRequired,
  success,
  unsupported,
} from "@/lib/providers/result";
import type {
  ProviderSubmissionInput,
  ProviderSubmissionResult,
} from "@/lib/providers/types";
import { runPlaywrightJob } from "@/lib/providers/playwright/browser";
import { detectCaptcha } from "@/lib/providers/playwright/helpers";

const ID = "phishtank";

export async function phishtankPlaywrightSubmit(
  input: ProviderSubmissionInput
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.PLAYWRIGHT_ENABLED) return disabled(ID, "PLAYWRIGHT_ENABLED=false");
  if (!e.PHISHTANK_PLAYWRIGHT_ENABLED)
    return disabled(ID, "PHISHTANK_PLAYWRIGHT_ENABLED=false");

  const username = e.PHISHTANK_USERNAME;
  const password = e.PHISHTANK_PASSWORD;
  if (!username || !password) {
    return disabled(ID, "Missing PHISHTANK_USERNAME/PASSWORD");
  }
  if (input.indicator.type !== "url")
    return unsupported(ID, "PhishTank submission accepts URL only");

  if (input.mode === "dry_run") {
    return success(ID, { message: "dry run (Playwright)" });
  }

  return runPlaywrightJob(ID, async (page) => {
    try {
      await page.goto("https://www.phishtank.com/login.php", {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (await detectCaptcha(page)) {
        return manualRequired(
          ID,
          "PhishTank login page presents CAPTCHA. Submit manually."
        );
      }

      await page.fill('input[name="username"]', username);
      await page.fill('input[name="password"]', password);
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        page.click('button[type="submit"], input[type="submit"]'),
      ]);

      if (page.url().includes("login.php")) {
        return failed(ID, "PhishTank login failed");
      }
      if (await page.locator('input[name="otp"], input[name="2fa"]').count()) {
        return manualRequired(ID, "PhishTank requires 2FA. Submit manually.");
      }

      await page.goto("https://www.phishtank.com/add_web_phish.php", {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await page.fill(
        'textarea[name="phish_url"], input[name="phish_url"]',
        input.indicator.normalizedValue
      );
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        page.click('button[type="submit"], input[type="submit"]'),
      ]);

      const successText = await page.locator("text=Thank you").count();
      if (successText > 0) {
        return success(ID, { message: "Submitted via Playwright" });
      }
      return failed(ID, "No success indicator after submission");
    } catch (err) {
      return failed(ID, err instanceof Error ? err.message : String(err));
    }
  });
}
