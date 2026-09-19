// Dev-only: drive the panel through its interactions and capture review
// frames (desktop + phone) into a temp dir. Not for the README.
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright-core");
const out = process.argv[2] || path.resolve(process.env.TMPDIR || "/tmp", "tk-review");
fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:38886";
const panel = `${base}/plugins/tinkerer/tinkerer`;

async function run(name, viewport, mobile) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: "dark" });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${name}] pageerror`, e.message));
  const shot = (label) => page.screenshot({ path: path.join(out, `${name}-${label}.png`) });
  await page.goto(panel, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(16000);
  await shot("timeline");
  // Topic filter
  await page.getByRole("button", { name: /^Topic/ }).first().click();
  await page.waitForTimeout(800);
  await page.getByPlaceholder("Find a topic").fill("AI");
  await page.waitForTimeout(400);
  await shot("topic-picker");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);
  await shot("topic-feed");
  // Comments on the first card
  const comments = page.getByRole("button", { name: "Show comments" }).first();
  if (await comments.count()) {
    await comments.click();
    await page.waitForTimeout(3000);
    await shot("comments");
  }
  // Inbox → Messages, then a conversation
  await page.goto(`${panel}/inbox/dms`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await shot("dms");
  const convo = page.locator("li button").first();
  if (await convo.count()) {
    await convo.click();
    await page.waitForTimeout(4000);
    await shot("dm-thread");
  }
  await page.goto(`${panel}/inbox/topics`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  const topic = page.locator("li button").first();
  if (await topic.count()) {
    await topic.click();
    await page.waitForTimeout(4000);
    await shot("topic-chat");
  }
  await page.goto(`${panel}/me`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  await page.getByRole("tab", { name: "Month" }).click();
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const el = document.querySelector("#tk-leaderboard"); el && el.scrollIntoView(); });
  await page.waitForTimeout(500);
  await shot("leaderboard");
  // Composer
  await page.goto(panel, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await page.getByRole("button", { name: "New post", exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.getByLabel("Post content").fill("Shipped the Tinkerer plugin for bb with Claude Code: timeline, inbox, lock-in and a composer that lives in the sidebar. https://github.com/vburojevic/bb-plugin-tinkerer");
  await page.waitForTimeout(2500);
  await shot("composer");
  await page.getByRole("button", { name: "Add a topic" }).click();
  await page.waitForTimeout(800);
  await shot("composer-topics");
  await context.close();
  await browser.close();
}

(async () => {
  await run("desktop", { width: 1280, height: 820 }, false);
  await run("phone", { width: 390, height: 844 }, true);
  console.log("done", out);
})().catch((e) => { console.error(e); process.exit(1); });
