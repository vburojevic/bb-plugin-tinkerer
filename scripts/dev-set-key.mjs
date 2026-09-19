#!/usr/bin/env node
// Dev-only: copy TINKERER_API_KEY from .env.local into the installed plugin's
// secret setting via `bb plugin config`. Prints nothing but the outcome.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(here, "..", ".env.local"), "utf8");
const key = (env.match(/^TINKERER_API_KEY=(.*)$/m)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
if (!key) {
  console.error("TINKERER_API_KEY is empty in .env.local");
  process.exit(2);
}
const run = spawnSync("bb", ["plugin", "config", "tinkerer", "set", "apiKey", key], { encoding: "utf8" });
const out = `${run.stdout}${run.stderr}`.split(key).join("[REDACTED]");
console.log(run.status === 0 ? "apiKey set" : `failed (${run.status}): ${out.trim()}`);
