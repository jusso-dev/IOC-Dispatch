/**
 * Live, headed Playwright walk-through that exercises the CrowdSec CTI
 * provider through the real IntelRelay UI on http://localhost:3000 and
 * captures screenshots into docs/screenshots/ for the README.
 *
 * Steps:
 *   1. Open /submit.
 *   2. Clear provider selection, then check ONLY the CrowdSec tile.
 *   3. Paste an IPv4 known to be in the CrowdSec corpus.
 *   4. Set mode = lookup, name the batch.
 *   5. Press "preview" — screenshot the populated submit screen.
 *   6. Press the primary action, screenshot the confirm dialog, continue.
 *   7. Follow the redirect to /batches/<id>, expand the raw response.
 *   8. Screenshot the batch detail page + a tight crop of the indicator row.
 *
 * Run: node scripts/e2e-crowdsec.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "docs", "screenshots");

const APP = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Single known-bad IP — CrowdSec consistently has data on this one.
const SUSPECT_IP = "45.155.205.225";

const log = (...a) => console.log("[e2e]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await fs.mkdir(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 180,
    args: ["--window-size=1440,960"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  let exitCode = 0;
  try {
    log("opening /submit");
    await page.goto(`${APP}/submit`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    log("clearing provider selection");
    await page.getByRole("button", { name: /^none$/ }).click();

    log("checking CrowdSec tile only");
    const crowdsecLabel = page
      .locator("label")
      .filter({ has: page.locator("text=/^CrowdSec CTI$/") })
      .first();
    await crowdsecLabel.locator('button[role="checkbox"]').click();

    log("filling form");
    await page.getByLabel(/name \(optional\)/i).fill("crowdsec demo");
    await page.getByLabel(/tags \(csv\)/i).fill("readme, demo");
    await page
      .getByLabel(/comment \/ context/i)
      .fill("README screenshot capture run");
    await page.locator("select#mode").selectOption("lookup");
    await page.getByPlaceholder(/http:\/\/bad\.example/).fill(SUSPECT_IP);

    log("preview-first for the submit-screen shot");
    await page.getByRole("button", { name: /^preview$/ }).click();
    await page.waitForSelector("table");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => window.scrollTo(0, 0));
    const submitShot = path.join(SHOT_DIR, "submit.png");
    await page.screenshot({ path: submitShot, fullPage: true });
    log("saved", path.relative(ROOT, submitShot));

    log("clicking primary action");
    await page.getByRole("button", { name: /^lookup →$/ }).click();

    log("waiting for confirm dialog");
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await sleep(300);
    const confirmShot = path.join(SHOT_DIR, "confirm.png");
    await page.screenshot({ path: confirmShot });
    log("saved", path.relative(ROOT, confirmShot));

    await page
      .getByRole("dialog")
      .getByRole("button", { name: /continue →/i })
      .click();

    log("waiting for /batches/<id>");
    await page.waitForURL(/\/batches\/[a-z0-9]+$/i, { timeout: 30_000 });
    const batchUrl = page.url();
    log(`landed on ${batchUrl}`);
    await page.waitForLoadState("networkidle");

    log("expanding raw response");
    const rawToggle = page.getByRole("button", { name: /show raw/i }).first();
    if ((await rawToggle.count()) > 0) {
      await rawToggle.click();
      await page.waitForSelector("pre");
      await sleep(400);
    } else {
      log("no raw to expand (provider returned empty?)");
    }

    const batchShot = path.join(SHOT_DIR, "batch-detail.png");
    await page.screenshot({ path: batchShot, fullPage: true });
    log("saved", path.relative(ROOT, batchShot));

    // Tight crop of the single indicator block for a hero shot.
    const article = page.locator("article").first();
    const articleShot = path.join(SHOT_DIR, "result.png");
    await article.screenshot({ path: articleShot });
    log("saved", path.relative(ROOT, articleShot));

    // Pull final state for the terminal report.
    const id = batchUrl.split("/").pop();
    const res = await fetch(`${APP}/api/batches/${id}`);
    const data = await res.json();
    const attempt = data.batch?.indicators?.[0]?.attempts?.find(
      (a) => a.providerId === "crowdsec"
    );
    log("crowdsec attempt:", {
      status: attempt?.status,
      message: attempt?.errorMessage,
      externalUrl: attempt?.externalUrl,
    });

    const ok =
      attempt?.status === "success" &&
      typeof attempt?.errorMessage === "string" &&
      attempt.errorMessage.length > 0;
    if (!ok) {
      log("FAIL — CrowdSec attempt didn't return a success with message");
      exitCode = 1;
    } else {
      log("PASS — CrowdSec end-to-end lookup succeeded");
    }

    log("holding browser open for 6s");
    await sleep(6000);
  } catch (err) {
    log("script error:", err.message);
    exitCode = 2;
  } finally {
    await context.close();
    await browser.close();
  }
  process.exit(exitCode);
}

main();
