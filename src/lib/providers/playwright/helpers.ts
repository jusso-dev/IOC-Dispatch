export async function detectCaptcha(
  page: { locator: (sel: string) => { count: () => Promise<number> } },
  extraSelectors: string[] = []
): Promise<boolean> {
  const defaults = [
    '[id*="captcha"]',
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[title*="captcha" i]',
    'div.g-recaptcha',
    'div[class*="cf-challenge"]',
  ];
  const selectors = [...defaults, ...extraSelectors];
  for (const sel of selectors) {
    try {
      if ((await page.locator(sel).count()) > 0) return true;
    } catch {
      // ignore selector parse errors
    }
  }
  return false;
}
