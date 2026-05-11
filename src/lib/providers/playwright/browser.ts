import path from "node:path";
import fs from "node:fs/promises";
import { env } from "@/lib/env";
import { failed } from "@/lib/providers/result";
import type {
  ProviderSubmissionResult,
} from "@/lib/providers/types";

type PageType = Awaited<ReturnType<typeof getBrowser>> extends infer T
  ? T extends { newContext: (...args: never[]) => Promise<infer C> }
    ? C extends { newPage: () => Promise<infer P> }
      ? P
      : never
    : never
  : never;

let cached: { browser: unknown } | null = null;

async function getBrowser() {
  if (cached) return cached.browser as Awaited<ReturnType<typeof importChromium>>;
  const browser = await importChromium();
  cached = { browser };
  return browser;
}

async function importChromium() {
  // Dynamic import keeps `playwright` out of the Edge/middleware bundles.
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

/**
 * Run a Playwright job with the global PLAYWRIGHT_ENABLED gate. Provider-specific
 * gates (e.g. PHISHTANK_PLAYWRIGHT_ENABLED) are checked by the caller.
 *
 * Each job gets a fresh browser context so cookies, storage, and creds don't leak
 * across providers. Screenshots taken only on failure.
 */
export async function runPlaywrightJob(
  providerId: string,
  fn: (page: PageType) => Promise<ProviderSubmissionResult>
): Promise<ProviderSubmissionResult> {
  const e = env();
  if (!e.PLAYWRIGHT_ENABLED) {
    return {
      providerId,
      status: "disabled",
      message: "PLAYWRIGHT_ENABLED=false",
    };
  }

  let browser: Awaited<ReturnType<typeof importChromium>>;
  try {
    browser = await getBrowser();
  } catch (err) {
    return failed(providerId, `Failed to launch Chromium: ${(err as Error).message}`);
  }

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; IntelRelay/0.1; +https://example.invalid/intelrelay-bot)",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    return await fn(page as PageType);
  } catch (err) {
    const shot = await takeFailureScreenshot(page, providerId);
    return {
      providerId,
      status: "failed",
      message: (err as Error).message,
      raw: shot ? { screenshotPath: shot } : undefined,
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function takeFailureScreenshot(
  page: { screenshot: (opts: { path: string }) => Promise<unknown> },
  providerId: string
): Promise<string | null> {
  const e = env();
  try {
    const dir = path.resolve(e.PLAYWRIGHT_SCREENSHOT_DIR);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(
      dir,
      `${providerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    );
    await page.screenshot({ path: file });
    return file;
  } catch {
    return null;
  }
}
