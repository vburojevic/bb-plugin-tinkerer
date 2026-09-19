// Dev-only: capture README screenshots of the running plugin via playwright.
// Run with `bb tinkerer demo on` so no real member data is in the frames.
// Usage: NODE_PATH=<npx playwright-core node_modules> node scripts/screenshot.cjs [outDir] [baseUrl]
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright-core");

const out = process.argv[2] || path.resolve(__dirname, "..", "docs", "media");
const base = process.argv[3] || "http://127.0.0.1:38886";
const panel = `${base}/plugins/tinkerer/tinkerer`;
const CLIP = { x: 320, y: 0, width: 960, height: 820 };

async function settle(page, ms) {
  await page.waitForTimeout(ms);
}

async function desktop(browser, scheme) {
  const dir = path.join(out, scheme);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, colorScheme: scheme, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${scheme}] pageerror`, e.message));
  const shot = (name, opts = {}) => page.screenshot({ path: path.join(dir, `${name}.png`), clip: CLIP, ...opts });

  await page.goto(panel, { waitUntil: "domcontentloaded" });
  await settle(page, 16000);
  await shot("timeline");

  await page.getByRole("button", { name: "Show comments" }).first().click();
  await settle(page, 2500);
  await shot("comments");

  await page.goto(`${panel}/inbox`, { waitUntil: "domcontentloaded" });
  await settle(page, 5000);
  await shot("inbox");
  await page.getByRole("tab", { name: "Messages" }).click();
  await settle(page, 2000);
  // Scoped to the panel: the sidebar's thread rows are `li > button` too.
  await page.locator(".tk-root li button").first().click();
  await settle(page, 3000);
  await shot("dm");

  await page.goto(`${panel}/me`, { waitUntil: "domcontentloaded" });
  await settle(page, 6000);
  await shot("me");

  await page.goto(`${panel}/lockin`, { waitUntil: "domcontentloaded" });
  await settle(page, 5000);
  await shot("lockin");

  await page.goto(`${panel}/live`, { waitUntil: "domcontentloaded" });
  await settle(page, 5000);
  await shot("live");

  await page.goto(panel, { waitUntil: "domcontentloaded" });
  await settle(page, 5000);
  await page.getByRole("button", { name: "New post", exact: true }).first().click();
  await settle(page, 1200);
  await page.getByLabel("Post content").fill("Shipped the Tinkerer plugin for bb: timeline, inbox, lock-in and a composer that lives in the sidebar. https://github.com/vburojevic/bb-plugin-tinkerer");
  await settle(page, 2500);
  await shot("composer");
  await page.keyboard.press("Escape");
  await settle(page, 600);

  const footer = page.getByRole("button", { name: "Tinkerer Club", exact: true }).last();
  await footer.click();
  await settle(page, 2500);
  // Element shot: the disclosure alone, never the reader's own thread list.
  await page.locator(".tk-root.w-72").first().screenshot({ path: path.join(dir, "footer.png") });
  await page.keyboard.press("Escape");

  await page.goto(`${base}/settings/plugins/tinkerer`, { waitUntil: "domcontentloaded" });
  await settle(page, 6000);
  await shot("settings");
  console.log(`${scheme}: desktop done`);
  await context.close();
}

async function phone(browser, scheme) {
  const dir = path.join(out, scheme);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const shot = (name) => page.screenshot({ path: path.join(dir, `phone-${name}.png`) });
  await page.goto(panel, { waitUntil: "domcontentloaded" });
  await settle(page, 14000);
  await shot("timeline");
  await page.goto(`${panel}/me`, { waitUntil: "domcontentloaded" });
  await settle(page, 5000);
  await shot("me");
  await page.goto(`${panel}/lockin`, { waitUntil: "domcontentloaded" });
  await settle(page, 5000);
  await shot("lockin");
  console.log(`${scheme}: phone done`);
  await context.close();
}

async function dmOnly(browser, scheme) {
  const dir = path.join(out, scheme);
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, colorScheme: scheme, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${panel}/inbox/dms`, { waitUntil: "domcontentloaded" });
  await settle(page, 15000);
  await page.locator(".tk-root li button").first().click();
  await settle(page, 3000);
  await page.screenshot({ path: path.join(dir, "dm.png"), clip: CLIP });
  console.log(`${scheme}: dm done`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const only = process.env.TK_ONLY;
  for (const scheme of ["light", "dark"]) {
    if (only === "dm") {
      await dmOnly(browser, scheme);
      continue;
    }
    await desktop(browser, scheme);
    await phone(browser, scheme);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
