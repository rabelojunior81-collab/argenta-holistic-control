/**
 * Kilo API Discovery — endpoints reais baseados no OpenAPI spec /doc
 * Execute: node kilo-adapter/discover.mjs
 * (kilo serve deve estar ativo na porta 4096)
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const cfg   = JSON.parse(await readFile(join(__dir, "config.json"), "utf8"));
const BASE  = cfg.base_url;

const PROBES = [
  // Health
  { method: "GET",  path: "/global/health" },
  // OpenAPI spec
  { method: "GET",  path: "/doc" },
  // Sessions
  { method: "GET",  path: "/session" },
  { method: "POST", path: "/session",
    body: { providerID: "github-copilot", modelID: "claude-sonnet-4.6" } },
  // Providers
  { method: "GET",  path: "/provider" },
  // Config
  { method: "GET",  path: "/global/config" },
  // Events (SSE — só verifica se aceita)
  { method: "GET",  path: "/global/event" },
  // Kilo-specific
  { method: "GET",  path: "/kilo/profile" },
  { method: "GET",  path: "/kilo/cloud-sessions" },
];

console.log(`\n=== Kilo API Discovery — ${BASE} ===\n`);

for (const probe of PROBES) {
  try {
    const opts = {
      method: probe.method,
      signal: AbortSignal.timeout(5000),
      headers: { "Content-Type": "application/json" },
    };
    if (probe.body) opts.body = JSON.stringify(probe.body);

    const res = await fetch(`${BASE}${probe.path}`, opts);
    const ct  = res.headers.get("content-type") ?? "";
    const raw = await res.text();
    const isJson = ct.includes("json");
    const preview = raw.slice(0, 150).replace(/\n/g, " ");

    const icon = res.status < 400 ? "✓" : "✗";
    console.log(`${icon} [${res.status}] ${probe.method.padEnd(4)} ${probe.path}`);
    if (res.status < 400) {
      console.log(`       ct: ${ct}`);
      if (isJson) {
        try {
          const parsed = JSON.parse(raw);
          const keys = Array.isArray(parsed)
            ? `Array[${parsed.length}]`
            : Object.keys(parsed).slice(0, 8).join(", ");
          console.log(`       keys: ${keys}`);
        } catch {
          console.log(`       body: ${preview}`);
        }
      } else {
        console.log(`       body: ${preview}`);
      }
    } else {
      console.log(`       error: ${raw.slice(0, 120)}`);
    }
  } catch (e) {
    console.log(`? [ERR] ${probe.method.padEnd(4)} ${probe.path}  — ${e.message}`);
  }
}

console.log("\n=== done ===\n");
