#!/usr/bin/env node
/**
 * Kanban CLI — gerenciamento de tasks do Mission Control
 *
 * Comandos:
 *   add  <title> --domain <domain> [--agent <agent>] [--priority <low|medium|high>]
 *   list [--status <status>]
 *   move <id> <status>
 *   done <id>
 *   show <id>
 *   rm   <id>
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dir = dirname(fileURLToPath(import.meta.url));
const STORE = join(__dir, "tasks.json");

const STATUSES = ["pending", "in_progress", "blocked", "review", "done"];

// ─── Load / Save ─────────────────────────────────────────────────────────────

async function load() {
  const raw = await readFile(STORE, "utf8");
  return JSON.parse(raw);
}

async function save(db) {
  db.updated = new Date().toISOString();
  await writeFile(STORE, JSON.stringify(db, null, 2), "utf8");
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function add(args) {
  const titleIdx = args.findIndex((a) => !a.startsWith("--"));
  if (titleIdx === -1) return usage("add requires a title");
  const title = args[titleIdx];
  const domain = flag(args, "--domain") ?? "execution";
  const agent = flag(args, "--agent") ?? null;
  const priority = flag(args, "--priority") ?? "medium";

  const db = await load();
  const task = {
    id: randomUUID().slice(0, 8),
    title,
    domain,
    agent,
    priority,
    status: "pending",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    result: null,
    events: [],
  };
  db.tasks.push(task);
  await save(db);
  console.log(`[kanban] added #${task.id}  "${task.title}"  domain=${task.domain}  priority=${task.priority}`);
}

async function list(args) {
  const filterStatus = flag(args, "--status");
  const db = await load();
  const tasks = filterStatus
    ? db.tasks.filter((t) => t.status === filterStatus)
    : db.tasks;

  if (tasks.length === 0) {
    console.log("[kanban] no tasks found");
    return;
  }

  const cols = {
    id: 10, status: 12, priority: 8, domain: 14, title: 40,
  };
  const header = padRow(cols, { id: "ID", status: "STATUS", priority: "PRI", domain: "DOMAIN", title: "TITLE" });
  const sep = "─".repeat(header.length);
  console.log(sep);
  console.log(header);
  console.log(sep);
  for (const t of tasks) {
    console.log(padRow(cols, { id: t.id, status: t.status, priority: t.priority, domain: t.domain, title: t.title }));
  }
  console.log(sep);
  console.log(`total: ${tasks.length}`);
}

async function move(args) {
  const [id, status] = args;
  if (!id || !status) return usage("move requires <id> <status>");
  if (!STATUSES.includes(status)) return usage(`invalid status: ${status}. Valid: ${STATUSES.join(", ")}`);

  const db = await load();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return console.error(`[kanban] task #${id} not found`);

  const prev = task.status;
  task.status = status;
  task.updated = new Date().toISOString();
  task.events.push({ ts: new Date().toISOString(), from: prev, to: status });
  await save(db);
  console.log(`[kanban] #${id} "${task.title}"  ${prev} → ${status}`);
}

async function done(args) {
  return move([args[0], "done"]);
}

async function show(args) {
  const [id] = args;
  if (!id) return usage("show requires <id>");
  const db = await load();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return console.error(`[kanban] task #${id} not found`);
  console.log(JSON.stringify(task, null, 2));
}

async function rm(args) {
  const [id] = args;
  if (!id) return usage("rm requires <id>");
  const db = await load();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return console.error(`[kanban] task #${id} not found`);
  const [removed] = db.tasks.splice(idx, 1);
  await save(db);
  console.log(`[kanban] removed #${removed.id} "${removed.title}"`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flag(args, name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

function padRow(cols, row) {
  return Object.entries(cols)
    .map(([k, w]) => String(row[k] ?? "").padEnd(w).slice(0, w))
    .join("  ");
}

function usage(msg) {
  if (msg) console.error(`[kanban] error: ${msg}`);
  console.log(`
Usage: node kanban/cli.mjs <command> [options]

Commands:
  add  <title> --domain <domain> [--agent <name>] [--priority low|medium|high]
  list [--status pending|in_progress|blocked|review|done]
  move <id> <status>
  done <id>
  show <id>
  rm   <id>

Domains: planning, execution, audit, research, quick, local, review, synthesis
  `);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const [, , cmd, ...rest] = process.argv;
const commands = { add, list, move, done, show, rm };
if (!cmd || !commands[cmd]) {
  usage();
} else {
  await commands[cmd](rest);
}
