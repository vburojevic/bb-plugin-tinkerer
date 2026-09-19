#!/usr/bin/env node
// Dev-only probe: POST a Tinkerer procedure using the key from .env.local.
// The key is passed to curl through a config file on stdin, never argv, and
// never printed. Usage: node scripts/probe.mjs <ns/proc> ['{"json":1}'] [--max N]
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(here, "..", ".env.local"), "utf8");
const match = env.match(/^TINKERER_API_KEY=(.*)$/m);
const key = (match?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
if (key.length === 0) {
  console.error("TINKERER_API_KEY is empty in .env.local");
  process.exit(2);
}
const [proc, rawBody, ...rest] = process.argv.slice(2);
const maxIdx = rest.indexOf("--max");
const max = maxIdx >= 0 ? Number(rest[maxIdx + 1]) : 4000;
if (!proc) {
  console.error("usage: probe <ns/proc> [json] [--max N]");
  process.exit(2);
}
const bodyPath = resolve(process.env.TMPDIR ?? "/tmp", `tinkerer-probe-${process.pid}.json`);
writeFileSync(bodyPath, rawBody ?? "{}");
const config = [
  `url = "https://app.tinkerer.club/api/v1/${proc}"`,
  `request = "POST"`,
  `header = "content-type: application/json"`,
  `header = "x-api-key: ${key}"`,
  `data-binary = "@${bodyPath}"`,
  `silent`,
  `show-error`,
  `max-time = 60`,
  `write-out = "\\n%{http_code}"`,
].join("\n");
const run = spawnSync("curl", ["-K", "-"], { input: config, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
unlinkSync(bodyPath);
const out = (run.stdout ?? "") + (run.stderr ?? "");
const redacted = out.split(key).join("[REDACTED]");
const lines = redacted.trimEnd().split("\n");
const status = lines.pop();
const body = lines.join("\n");
console.log("HTTP", status);
console.log(body.length > max ? body.slice(0, max) + `…(+${body.length - max} chars)` : body);
