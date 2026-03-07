/**
 * Ralph Loop — Observe → Decide → Dispatch → Verify → Log
 *
 * O loop principal do Mission Control.
 * Roda continuamente (intervalo configurável), processa tasks do kanban
 * roteando cada uma para o provider/model correto via Expertise Matrix + Kilo Adapter.
 */

import { readFile, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");

// ─── Config ──────────────────────────────────────────────────────────────────

const LOOP_INTERVAL_MS = 10_000;   // tick a cada 10s
const KANBAN_PATH     = join(ROOT, "kanban/tasks.json");
const MATRIX_PATH     = join(ROOT, "expertise-matrix/matrix.yaml");
const EVENTS_PATH     = join(ROOT, "ops/events.jsonl");
const STATE_PATH      = join(ROOT, "ops/state.json");

// ─── Imports dinâmicos (evita circular ao testar) ─────────────────────────────

const { start: kiloStart, isRunning } = await import("../kilo-adapter/server-manager.mjs");
const { dispatch }                    = await import("../kilo-adapter/adapter.mjs");

// ─── YAML parser minimalista (evita dep externa no loop core) ────────────────

function parseMatrix(raw) {
  // Parser YAML minimalista para a matrix v2 (providerID + modelID)
  const result = { domains: {}, default: null };
  let currentDomain = null;

  for (const line of raw.split("\n")) {
    // Detecta bloco de domínio (ex: "  planning:" com 2 espaços)
    const domainMatch = line.match(/^  (\w+):(\s*)$/);
    // Detecta bloco default (sem indentação)
    const defaultMatch = line.match(/^default:\s*$/);
    // Detecta providerID ou modelID (4 espaços de indentação, não dentro de fallback)
    const providerIDMatch = line.match(/^    providerID:\s+(.+)$/);
    const modelIDMatch    = line.match(/^    modelID:\s+(.+)$/);
    // Suporte legado: provider/model
    const providerMatch = line.match(/^    provider:\s+(.+)$/);
    const modelMatch    = line.match(/^    model:\s+(.+)$/);

    if (defaultMatch) { currentDomain = "__default__"; result.domains.__default__ = {}; continue; }
    if (domainMatch && !line.startsWith("    ")) { currentDomain = domainMatch[1]; result.domains[currentDomain] = {}; continue; }
    if (!currentDomain) continue;

    const agentMatch = line.match(/^    agent:\s+(.+)$/);
    if (agentMatch)      result.domains[currentDomain].agent      = agentMatch[1].trim().replace(/["']/g, "");
    if (providerIDMatch) result.domains[currentDomain].providerID = providerIDMatch[1].trim().replace(/["']/g, "");
    if (modelIDMatch)    result.domains[currentDomain].modelID    = modelIDMatch[1].trim().replace(/["']/g, "");
    // legado
    if (providerMatch && !result.domains[currentDomain].providerID) result.domains[currentDomain].providerID = providerMatch[1].trim();
    if (modelMatch && !result.domains[currentDomain].modelID)    result.domains[currentDomain].modelID    = modelMatch[1].trim();
  }

  result.default = result.domains.__default__ ?? { providerID: "github-copilot", modelID: "claude-sonnet-4.6" };
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadKanban() {
  const raw = await readFile(KANBAN_PATH, "utf8");
  return JSON.parse(raw);
}

async function saveKanban(db) {
  db.updated = new Date().toISOString();
  await writeFile(KANBAN_PATH, JSON.stringify(db, null, 2), "utf8");
}

async function loadMatrix() {
  const raw = await readFile(MATRIX_PATH, "utf8");
  return parseMatrix(raw);
}

async function logEvent(event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  await appendFile(EVENTS_PATH, line, "utf8");
}

async function updateState(patch) {
  let state = {};
  if (existsSync(STATE_PATH)) {
    state = JSON.parse(await readFile(STATE_PATH, "utf8"));
  }
  const next = { ...state, ...patch, updated: new Date().toISOString() };
  await writeFile(STATE_PATH, JSON.stringify(next, null, 2), "utf8");
}

function route(domain, matrix) {
  const entry = matrix.domains[domain] ?? matrix.default;
  return { providerID: entry.providerID, modelID: entry.modelID, agent: entry.agent ?? "code" };
}

// ─── Loop phases ──────────────────────────────────────────────────────────────

async function observe() {
  const db = await loadKanban();
  return db.tasks.filter((t) => t.status === "pending");
}

async function decide(tasks, matrix) {
  if (tasks.length === 0) return null;
  const priority = { high: 3, medium: 2, low: 1 };
  tasks.sort((a, b) => (priority[b.priority] ?? 1) - (priority[a.priority] ?? 1));
  const task = tasks[0];
  const routing = route(task.domain, matrix);
  return { task, ...routing };
}

async function dispatchTask(decision) {
  const { task, providerID, modelID, agent } = decision;
  const decisionId = randomUUID().slice(0, 8);

  console.log(`[ralph] dispatch #${task.id} "${task.title}" → [${agent}] ${providerID}/${modelID}`);

  await logEvent({
    event: "dispatch",
    decision_id: decisionId,
    task_id: task.id,
    domain: task.domain,
    agent,
    providerID,
    modelID,
  });

  // Marca in_progress no kanban
  const db = await loadKanban();
  const t = db.tasks.find((x) => x.id === task.id);
  if (!t) return null;
  t.status = "in_progress";
  t.updated = new Date().toISOString();
  t.events.push({ ts: new Date().toISOString(), from: "pending", to: "in_progress", decision_id: decisionId });
  await saveKanban(db);

  // Despacha via Kilo Adapter
  try {
    const result = await dispatch(providerID, modelID, task.title, (chunk) => process.stdout.write(chunk), agent);
    return { decisionId, task, result, providerID, modelID, agent, success: true };
  } catch (err) {
    console.error(`[ralph] dispatch error: ${err.message}`);
    return { decisionId, task, result: null, providerID, modelID, agent, success: false, error: err.message };
  }
}

async function verify(outcome) {
  const { task, result, success, decisionId, providerID, modelID, error } = outcome;
  const db = await loadKanban();
  const t = db.tasks.find((x) => x.id === task.id);
  if (!t) return;

  const newStatus = success ? "review" : "blocked";
  t.status = newStatus;
  t.updated = new Date().toISOString();
  t.result = result;
  t.events.push({ ts: new Date().toISOString(), from: "in_progress", to: newStatus, decision_id: decisionId });
  await saveKanban(db);

  await logEvent({
    event: success ? "completed" : "failed",
    decision_id: decisionId,
    task_id: task.id,
    providerID,
    modelID,
    outcome: newStatus,
    error: error ?? null,
    result_length: result?.length ?? 0,
  });

  console.log(`[ralph] #${task.id} → ${newStatus} (${success ? "ok" : "error: " + error})`);
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

async function tick() {
  const matrix = await loadMatrix();
  const pending = await observe();

  await updateState({ loop_tick: new Date().toISOString(), pending_count: pending.length });

  if (pending.length === 0) {
    process.stdout.write(".");  // heartbeat visual silencioso
    return;
  }

  process.stdout.write("\n");
  const decision = await decide(pending, matrix);
  if (!decision) return;

  const outcome = await dispatchTask(decision);
  if (outcome) await verify(outcome);
}

async function run() {
  console.log("[ralph] starting Mission Control loop");
  console.log(`[ralph] kilo serve: checking...`);

  await kiloStart();

  await logEvent({ event: "loop_start", pid: process.pid });
  await updateState({ status: "running", pid: process.pid });

  // tick imediato, depois a cada LOOP_INTERVAL_MS
  await tick();
  setInterval(async () => {
    try { await tick(); }
    catch (e) { console.error(`[ralph] tick error: ${e.message}`); }
  }, LOOP_INTERVAL_MS);

  process.on("SIGINT", async () => {
    console.log("\n[ralph] shutting down");
    await logEvent({ event: "loop_stop", pid: process.pid });
    await updateState({ status: "stopped" });
    process.exit(0);
  });
}

await run();
