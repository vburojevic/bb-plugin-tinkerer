const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:38886/plugins/tinkerer/tinkerer", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const vars = await page.evaluate(() => {
    const out = {};
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const names = new Set();
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.style) for (const p of rule.style) if (p.startsWith("--")) names.add(p);
      }
    }
    for (const n of names) { const v = cs.getPropertyValue(n).trim(); if (v && /color|primary|accent|brand|ring|chart|favicon|tint|highlight|success|warn|info|destructive/i.test(n)) out[n] = v; }
    out.__class = root.className; out.__attrs = Array.from(root.attributes).map(a => a.name + "=" + a.value.slice(0, 40)).join(" ");
    return out;
  });
  console.log(JSON.stringify(vars, null, 1));
  await browser.close();
})();
