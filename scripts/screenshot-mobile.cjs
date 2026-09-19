// Dev-only: compact-viewport review captures (not for the README).
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright-core");
const out = process.argv[2] || path.resolve(process.env.TMPDIR || "/tmp", "tk-mobile");
fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:38886";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark" });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  const routes = ["", "inbox", "me", "lockin", "live"];
  let first = true;
  for (const r of routes) {
    await page.goto(`${base}/plugins/tinkerer/tinkerer/${r}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(first ? 16000 : 5000);
    first = false;
    await page.screenshot({ path: path.join(out, `${r || "timeline"}.png`) });
    console.log(`${r || "timeline"} ok`);
  }
  await page.goto(`${base}/plugins/tinkerer/tinkerer`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  const newPost = page.getByRole("button", { name: "New post", exact: true }).first();
  if (await newPost.count()) {
    await newPost.click();
    await page.waitForTimeout(1500);
    await page.getByLabel("Post content").fill("Testing the composer on a phone https://getbb.app");
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, "composer.png") });
    console.log("composer ok");
  }
  await context.close();
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
