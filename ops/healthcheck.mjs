#!/usr/bin/env node
/**
 * Healthcheck standalone — usado pelo HEARTBEAT da Argenta e pelo cron.
 *
 * Verifica:
 *   1. kilo serve responde em /health
 *   2. ops/events.jsonl tem eventos recentes (< 1h)
 *   3. kanban/tasks.json é válido e legível
 *   4. ralph-loop está rodando (via ops/state.json)
 *   5. snapshot da subscription OpenAI/Codex recente e saudável
 *
 * Exit codes:
 *   0 = tudo OK
 *   1 = algum problema (detalhes no stdout)
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");

const results = [];
let allOk = true;

function ok(label, detail = "") {
  results.push({ status: "OK", label, detail });
}

function fail(label, detail = "") {
  results.push({ status: "FAIL", label, detail });
  allOk = false;
}

function warn(label, detail = "") {
  results.push({ status: "WARN", label, detail });
}

// ─── Check 1: kilo serve ─────────────────────────────────────────────────────

try {
  const cfg = JSON.parse(await readFile(join(ROOT, "kilo-adapter/config.json"), "utf8"));
  const res = await fetch(`${cfg.base_url}${cfg.health_endpoint}`, {
    signal: AbortSignal.timeout(3000),
  });
  if (res.ok) {
    ok("kilo-serve", `${cfg.base_url} → HTTP ${res.status}`);
  } else {
    fail("kilo-serve", `HTTP ${res.status}`);
  }
} catch (e) {
  fail("kilo-serve", `unreachable: ${e.message}`);
}

// ─── Check 2: events recentes ────────────────────────────────────────────────

const eventsPath = join(ROOT, "ops/events.jsonl");
if (!existsSync(eventsPath)) {
  warn("events.jsonl", "file not found (loop never started?)");
} else {
  const raw = await readFile(eventsPath, "utf8");
  const lines = raw.trim().split("\n").filter(Boolean);
  if (lines.length === 0) {
    warn("events.jsonl", "empty (loop never ran)");
  } else {
    const last = JSON.parse(lines[lines.length - 1]);
    const age = Date.now() - new Date(last.ts).getTime();
    const ageMin = Math.round(age / 60_000);
    if (ageMin > 60) {
      warn("events.jsonl", `last event ${ageMin}m ago (loop stalled?)`);
    } else {
      ok("events.jsonl", `last event ${ageMin}m ago  total=${lines.length}`);
    }
  }
}

// ─── Check 3: kanban válido ──────────────────────────────────────────────────

const kanbanPath = join(ROOT, "kanban/tasks.json");
if (!existsSync(kanbanPath)) {
  fail("kanban", "tasks.json not found");
} else {
  try {
    const db = JSON.parse(await readFile(kanbanPath, "utf8"));
    const counts = {};
    for (const t of db.tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
    ok("kanban", `tasks=${db.tasks.length}  ${JSON.stringify(counts)}`);
  } catch (e) {
    fail("kanban", `parse error: ${e.message}`);
  }
}

// ─── Check 4: ralph-loop state ───────────────────────────────────────────────

const statePath = join(ROOT, "ops/state.json");
if (!existsSync(statePath)) {
  warn("ralph-loop", "state.json not found");
} else {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  if (state.status === "running") {
    const tick = state.loop_tick ? new Date(state.loop_tick) : null;
    const ageMin = tick ? Math.round((Date.now() - tick.getTime()) / 60_000) : null;
    if (ageMin !== null && ageMin > 5) {
      warn("ralph-loop", `running but last tick ${ageMin}m ago`);
    } else {
      ok("ralph-loop", `running  pid=${state.pid}  last_tick=${ageMin ?? "?"}m ago`);
    }
  } else {
    warn("ralph-loop", `status=${state.status}`);
  }
}

// ─── Check 5: OpenAI/Codex subscription snapshot ────────────────────────────

const subscriptionPath = join(ROOT, "ops/openai-subscription-state.json");
try {
  let sub = null;
  if (existsSync(subscriptionPath)) {
    sub = JSON.parse(await readFile(subscriptionPath, "utf8"));
  }

  const staleMin = sub?.timestamp ? Math.round((Date.now() - new Date(sub.timestamp).getTime()) / 60_000) : null;
  if (!sub || staleMin === null || staleMin > 15) {
    const raw = execFileSync(process.execPath, [join(ROOT, "ops/openai-subscription-snapshot.mjs"), "--persist"], {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });
    sub = JSON.parse(raw);
  }

  if (!sub) {
    warn("subscription", "snapshot unavailable");
  } else if (sub.health === "degraded") {
    fail("subscription", `${sub.model?.effective ?? "unknown"}  alerts=${(sub.alerts?.items ?? []).join(",") || "n/a"}`);
  } else if (sub.health === "warn") {
    warn("subscription", `${sub.model?.effective ?? "unknown"}  5h=${sub.usage?.fiveHour?.remainingPercent ?? "?"}%  week=${sub.usage?.week?.remainingPercent ?? "?"}%`);
  } else {
    ok("subscription", `${sub.model?.effective ?? "unknown"}  5h=${sub.usage?.fiveHour?.remainingPercent ?? "?"}%  week=${sub.usage?.week?.remainingPercent ?? "?"}%`);
  }
} catch (e) {
  warn("subscription", `snapshot error: ${e.message}`);
}

// ─── Output ──────────────────────────────────────────────────────────────────

console.log("\n=== Mission Control Healthcheck ===");
console.log(`timestamp: ${new Date().toISOString()}`);
console.log("");

for (const r of results) {
  const icon = r.status === "OK" ? "✓" : r.status === "WARN" ? "⚠" : "✗";
  console.log(`  ${icon} [${r.status.padEnd(4)}] ${r.label.padEnd(14)} ${r.detail}`);
}

console.log("");
console.log(`result: ${allOk ? "HEALTHCHECK_OK" : "HEALTHCHECK_DEGRADED"}`);
console.log("===================================\n");

process.exit(allOk ? 0 : 1);
