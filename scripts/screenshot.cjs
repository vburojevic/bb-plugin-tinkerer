// Dev-only: capture README screenshots of the running plugin via playwright.
// Usage: NODE_PATH=<npx playwright-core node_modules> node scripts/screenshot.cjs [outDir] [baseUrl]
const path = require("node:path");
const { chromium } = require("playwright-core");

const out = process.argv[2] || path.resolve(__dirname, "..", "docs", "media");
const base = process.argv[3] || "http://127.0.0.1:38886";
const shots = [
  { name: "timeline", route: "/plugins/tinkerer/tinkerer" },
  { name: "inbox", route: "/plugins/tinkerer/tinkerer/inbox" },
  { name: "me", route: "/plugins/tinkerer/tinkerer/me" },
  { name: "lockin", route: "/plugins/tinkerer/tinkerer/lockin" },
  { name: "live", route: "/plugins/tinkerer/tinkerer/live" },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, colorScheme: scheme, deviceScaleFactor: 2 });
    const page = await context.newPage();
    page.on("pageerror", (e) => console.log(`[${scheme}] pageerror`, e.message));
    let first = true;
    for (const shot of shots) {
      await page.goto(`${base}${shot.route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(first ? 16000 : 6000);
      first = false;
      const file = path.join(out, scheme, `${shot.name}.png`);
      // Crop to the panel: the reader's own sidebar is not the subject.
      await page.screenshot({ path: file, clip: { x: 320, y: 0, width: 960, height: 820 } });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      console.log(`${scheme}/${shot.name} ok (body bg ${bg})`);
    }
    if (process.env.TK_FOOTER === "1") {
      await page.goto(`${base}/plugins/tinkerer/tinkerer`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(6000);
      const newPost = page.getByRole("button", { name: "New post", exact: true }).first();
      if (await newPost.count()) {
        await newPost.click();
        await page.getByLabel("Post content").fill("Shipped the Tinkerer plugin for bb: timeline, inbox, lock-in and a composer that lives in the sidebar. https://github.com/vburojevic/bb-plugin-tinkerer");
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(out, scheme, "composer.png"), clip: { x: 320, y: 0, width: 960, height: 820 } });
        console.log(`${scheme}/composer ok`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
      const btn = page.getByRole("button", { name: "Tinkerer Club", exact: true }).last();
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(out, scheme, "footer.png") });
        console.log(`${scheme}/footer ok`);
      }
    }
    await context.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
