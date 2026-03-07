/**
 * mc task <subcommand> [args] [--flags]
 *
 * Subcommands:
 *   list   [--status <s>] [--domain <d>] [--agent <a>]
 *   add    <title> [--domain <d>] [--agent <a>] [--priority <p>]
 *   move   <id> <status>
 *   remove <id>
 *   show   <id>
 */
import { C, api, apiPost, apiPatch, apiDel, statusDot, fmtTs, paint, section, kv } from "../mc.mjs";

const STATUS_COLOR = {
  pending:     C.gray,
  in_progress: C.lime,
  blocked:     C.red,
  review:      C.yellow,
  done:        C.green,
};

export async function run(args, flags) {
  const [sub, ...rest] = args;

  switch (sub) {
    case "list":   return cmdList(flags);
    case "add":    return cmdAdd(rest.join(" "), flags);
    case "move":   return cmdMove(rest[0], rest[1]);
    case "remove":
    case "rm":     return cmdRemove(rest[0]);
    case "show":   return cmdShow(rest[0]);
    default:
      if (!sub) return cmdList(flags); // default: list
      console.error(`${paint(C.red, "✗")} Subcomando: "${sub}" desconhecido. Tente: list · add · move · remove · show`);
      process.exit(1);
  }
}

// ── mc task list ──────────────────────────────────────────────────────────────

async function cmdList(flags) {
  let tasks = await api("/tasks");

  if (flags.status) tasks = tasks.filter(t => t.status === flags.status);
  if (flags.domain) tasks = tasks.filter(t => t.domain === flags.domain);
  if (flags.agent)  tasks = tasks.filter(t => t.agent  === flags.agent);

  if (!tasks.length) {
    console.log(paint(C.gray, "\n  — nenhuma task encontrada —\n"));
    return;
  }

  const filterParts = [
    flags.status ? `status: ${flags.status}` : null,
    flags.domain ? `domain: ${flags.domain}` : null,
    flags.agent  ? `agent: ${flags.agent}`   : null,
  ].filter(Boolean);

  section(`TASKS  [${tasks.length}]${filterParts.length ? "  (" + filterParts.join(" · ") + ")" : ""}`);

  // Group by status
  const ORDER = ["in_progress", "blocked", "review", "pending", "done"];
  const groups = ORDER.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  for (const [status, group] of Object.entries(groups)) {
    if (!group.length) continue;
    const hdr = paint(STATUS_COLOR[status] ?? C.gray, `▸ ${status.toUpperCase().replace("_", " ")}  (${group.length})`);
    console.log(`\n  ${hdr}`);
    for (const t of group) {
      _taskRow(t);
    }
  }
  console.log("");
}

// ── mc task show <id> ─────────────────────────────────────────────────────────

async function cmdShow(id) {
  if (!id) { console.error(paint(C.red, "✗ id requerido")); process.exit(1); }
  const tasks = await api("/tasks");
  const t     = tasks.find(x => x.id === id);
  if (!t) { console.error(paint(C.red, `✗ Task "${id}" não encontrada`)); process.exit(1); }

  section(`TASK: ${t.id}`);
  kv("título",    t.title);
  kv("status",    paint(STATUS_COLOR[t.status] ?? C.gray, t.status));
  kv("domain",    t.domain ?? "—");
  kv("agent",     t.agent  ?? "—");
  kv("priority",  t.priority ?? "—");
  kv("criada",    fmtTs(t.created));
  kv("atualizada",fmtTs(t.updated));
  if (t.chatKey)  kv("chatKey", t.chatKey);
  if (t.providerID) kv("provider", `${t.providerID} / ${t.modelID ?? "?"}`);
  if (t.result) {
    console.log(`\n  ${paint(C.bold, "Resultado:")}`);
    console.log("  " + (t.result ?? "").slice(0, 300).split("\n").join("\n  "));
  }
  if (t.events?.length) {
    console.log(`\n  ${paint(C.bold, "Histórico:")}`);
    for (const e of t.events.slice(-5)) {
      console.log(`    ${paint(C.gray, fmtTs(e.ts))}  ${e.from ?? "?"} → ${paint(C.lime, e.to ?? "?")}`);
    }
  }
  console.log("");
}

// ── mc task add <title> ───────────────────────────────────────────────────────

async function cmdAdd(title, flags) {
  if (!title) { console.error(paint(C.red, "✗ título requerido")); process.exit(1); }
  const task = await apiPost("/tasks", {
    title,
    domain:   flags.domain   ?? "execution",
    agent:    flags.agent    ?? null,
    priority: flags.priority ?? "medium",
  });
  console.log(paint(C.lime, `✓ Task criada`));
  kv("id",     task.id);
  kv("título", task.title);
  kv("status", task.status);
  console.log("");
}

// ── mc task move <id> <status> ────────────────────────────────────────────────

async function cmdMove(id, status) {
  const VALID = ["pending", "in_progress", "blocked", "review", "done"];
  if (!id || !status) {
    console.error(paint(C.red, "✗ Uso: mc task move <id> <status>"));
    console.error(paint(C.gray, `  Status válidos: ${VALID.join(" · ")}`));
    process.exit(1);
  }
  if (!VALID.includes(status)) {
    console.error(paint(C.red, `✗ Status inválido: "${status}". Válidos: ${VALID.join(", ")}`));
    process.exit(1);
  }
  const task = await apiPatch(`/tasks/${id}`, { status });
  console.log(paint(C.lime, `✓ Task "${id}" movida para ${paint(STATUS_COLOR[status] ?? C.white, status)}`));
}

// ── mc task remove <id> ───────────────────────────────────────────────────────

async function cmdRemove(id) {
  if (!id) { console.error(paint(C.red, "✗ id requerido")); process.exit(1); }
  await apiDel(`/tasks/${id}`);
  console.log(paint(C.lime, `✓ Task "${id}" removida`));
}

// ── Render helpers ─────────────────────────────────────────────────────────────

function _taskRow(t) {
  const prio   = { high: paint(C.red, "↑"), medium: paint(C.yellow, "→"), low: paint(C.gray, "↓") }[t.priority] ?? "·";
  const id     = paint(C.gray, t.id);
  const title  = t.title.slice(0, 52);
  const agent  = t.agent  ? paint(C.cyan, `[${t.agent}]`)  : "";
  const domain = t.domain ? paint(C.gray, t.domain.slice(0, 10)) : "";
  console.log(`    ${prio} ${id}  ${title}  ${agent} ${domain}`);
}
