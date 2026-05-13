import fs from "node:fs/promises";
import path from "node:path";
import type { Browser, Page } from "playwright";
import { env } from "@/lib/env";
import { moduleLogger } from "@/lib/logger";
import { failed } from "@/lib/providers/result";
import type { ProviderSubmissionResult } from "@/lib/providers/types";

const log = moduleLogger("playwright");

let cachedBrowser: Browser | null = null;

async function launchBrowser(): Promise<Browser> {
  // Dynamic import keeps `playwright` out of the Edge/middleware bundles.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  browser.on("disconnected", () => {
    log.warn("chromium disconnected; clearing cached browser");
    if (cachedBrowser === browser) cachedBrowser = null;
  });
  return browser;
}

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) return cachedBrowser;
  if (cachedBrowser) {
    await cachedBrowser.close().catch(() => undefined);
    cachedBrowser = null;
  }
  cachedBrowser = await launchBrowser();
  return cachedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (!cachedBrowser) return;
  const b = cachedBrowser;
  cachedBrowser = null;
  await b.close().catch((err) => log.warn("close error", { err }));
}

/**
 * Run a Playwright job with the global PLAYWRIGHT_ENABLED gate. Provider-specific
 * gates (e.g. PHISHTANK_PLAYWRIGHT_ENABLED) are checked by the caller.
 *
 * Each job gets a fresh browser context so cookies, storage, and creds don't leak
 * across providers. Screenshots are only taken on failure.
 */
export async function runPlaywrightJob(
  providerId: string,
  fn: (page: Page) => Promise<ProviderSubmissionResult>
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.PLAYWRIGHT_ENABLED) {
    return {
      providerId,
      status: "disabled",
      message: "PLAYWRIGHT_ENABLED=false",
    };
  }

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    return failed(
      providerId,
      `Failed to launch Chromium: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; IntelRelay/0.1; +https://example.invalid/intelrelay-bot)",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    return await fn(page);
  } catch (err) {
    log.warn("playwright job threw", { providerId, err });
    const shot = await takeFailureScreenshot(page, providerId);
    return {
      providerId,
      status: "failed",
      message: err instanceof Error ? err.message : String(err),
      raw: shot ? { screenshotPath: shot } : undefined,
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function takeFailureScreenshot(
  page: Page,
  providerId: string
): Promise<string | null> {
  try {
    const dir = path.resolve(env().PLAYWRIGHT_SCREENSHOT_DIR);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(
      dir,
      `${providerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    );
    await page.screenshot({ path: file });
    return file;
  } catch (err) {
    log.debug("screenshot failed", { providerId, err });
    return null;
  }
}
