#!/usr/bin/env node
/**
 * mc — argenta-CLI · Mission Control command line interface
 * Usage: node cli/mc.mjs <command> [subcommand] [args...] [--flags]
 *
 * Env vars:
 *   MC_URL   Override server URL (default: http://127.0.0.1:3030)
 */

import { fileURLToPath } from "node:url";
import { dirname, join }  from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

// ─── Arg parsing ──────────────────────────────────────────────────────────────

export function parseArgs(args) {
  const flags      = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key  = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) { flags[key] = next; i++; }
      else                                 flags[key] = true;
    } else {
      positional.push(args[i]);
    }
  }
  return { positional, flags };
}

const { positional: argv, flags } = parseArgs(process.argv.slice(2));
const [command, ...rest]          = argv;

// ─── Colors (ANSI) ───────────────────────────────────────────────────────────

export const C = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  italic:  "\x1b[3m",
  lime:    "\x1b[92m",
  green:   "\x1b[32m",
  blue:    "\x1b[94m",
  cyan:    "\x1b[96m",
  yellow:  "\x1b[93m",
  gold:    "\x1b[33m",
  red:     "\x1b[91m",
  magenta: "\x1b[95m",
  gray:    "\x1b[90m",
  white:   "\x1b[97m",
};

export const noColor = !!process.env.NO_COLOR;
export const paint   = (code, s) => noColor ? s : `${code}${s}${C.reset}`;

// ─── API client ───────────────────────────────────────────────────────────────

export const MC_URL = flags.url ?? process.env.MC_URL ?? "http://127.0.0.1:3030";
export const API    = `${MC_URL}/api`;

export async function api(path, opts = {}) {
  const url = `${API}${path}`;
  let res;
  try {
    res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    });
  } catch (e) {
    throw new Error(`Servidor offline? (${MC_URL}) — ${e.message}`);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text); } catch { return text; }
}

export async function apiPost(path, body)  { return api(path, { method: "POST",   body: JSON.stringify(body) }); }
export async function apiPatch(path, body) { return api(path, { method: "PATCH",  body: JSON.stringify(body) }); }
export async function apiDel(path)         { return api(path, { method: "DELETE" }); }

// ─── Shared render helpers ────────────────────────────────────────────────────

export function statusDot(status) {
  if (noColor) return { idle: "○", in_progress: "●", zombie: "✗", done: "✓", blocked: "⊘" }[status] ?? "?";
  const map = {
    idle:        paint(C.gray,   "○"),
    in_progress: paint(C.lime,   "●"),
    zombie:      paint(C.red,    "✗"),
    done:        paint(C.green,  "✓"),
    blocked:     paint(C.yellow, "⊘"),
  };
  return map[status] ?? paint(C.gray, "?");
}

export function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
       + " " + d.toLocaleTimeString("pt-BR");
}

export function bar(value, max = 100, width = 18) {
  const v = Math.max(0, Math.min(max, value));
  const f = Math.round((v / max) * width);
  return "█".repeat(f) + "░".repeat(width - f);
}

export function barColored(v, max = 100, width = 18) {
  const b = bar(v, max, width);
  const color = v >= 80 ? C.lime : v >= 50 ? C.yellow : C.red;
  return noColor ? b : `${color}${b}${C.reset}`;
}

export function section(title) {
  const line = "─".repeat(48);
  console.log(`\n${paint(C.gray, line)}`);
  console.log(paint(C.bold, `  ${title}`));
  console.log(paint(C.gray, line));
}

export function kv(key, value, keyWidth = 16) {
  const k = paint(C.gray, key.padEnd(keyWidth));
  console.log(`  ${k}  ${value}`);
}

export function topicColor(topic) {
  const map = {
    orchestration:  C.lime,
    debug:          C.red,
    brainstorm:     C.blue,
    "task-result":  C.green,
    "request-skill":C.gold,
    "request-agent":C.gold,
    heartbeat:      C.gray,
    memory:         C.magenta,
    alert:          C.red,
  };
  return paint(map[topic] ?? C.gray, topic);
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${paint(C.bold + C.lime, "mc")} — Mission Control CLI · ${paint(C.yellow, "Argenta Fênix")}

${paint(C.bold, "Usage:")} mc <command> [subcommand] [args] [--flags]

${paint(C.bold, "Visão geral:")}
  ${paint(C.lime, "mc status")}                         Hive overview
  ${paint(C.lime, "mc status --full")}                   Com stats completos por agente

${paint(C.bold, "Agentes:")}
  ${paint(C.lime, "mc agent list")}                      Lista todos os agentes
  ${paint(C.lime, "mc agent show <id>")}                 Character chart ASCII
  ${paint(C.lime, "mc agent spawn <soul> <mission>")}    Spawna Zambia
  ${paint(C.lime, "mc agent stop <id>")}                 Para chat do agente
  ${paint(C.lime, "mc agent talk <id> <msg>")}           Envia mensagem direta
  ${paint(C.lime, "mc agent skill add <id> <skill>")}    Adiciona skill
  ${paint(C.lime, "mc agent skill rm <id> <skill>")}     Remove skill
  ${paint(C.lime, "mc agent redirect <id> <p> <m>")}     Troca provider/model
  ${paint(C.lime, "mc agent close <id>")}                Encerra agente

${paint(C.bold, "Bulletin Board:")}
  ${paint(C.lime, "mc board read")}                      Lê o board (com filtros)
  ${paint(C.lime, "mc board post <topic> <content>")}    Posta mensagem
  ${paint(C.lime, "mc board reply <msg-id> <content>")}  Responde mensagem
  ${paint(C.lime, "mc board mark-read <msg-id>")}        Marca como lida

${paint(C.bold, "Kanban:")}
  ${paint(C.lime, "mc task list")}                       Lista tasks
  ${paint(C.lime, "mc task add <title>")}                Adiciona task
  ${paint(C.lime, "mc task move <id> <status>")}         Move task de status
  ${paint(C.lime, "mc task remove <id>")}                Remove task

${paint(C.bold, "Hive:")}
  ${paint(C.lime, "mc hive broadcast <topic> <msg>")}    Mensagem para todos
  ${paint(C.lime, "mc hive snapshot")}                   Snapshot do estado

${paint(C.bold, "Chat (REPL):")}
  ${paint(C.lime, "mc chat <agent-id>")}                 Chat interativo com agente

${paint(C.bold, "Flags globais:")}
  ${paint(C.gray, "--url <url>")}                        Override servidor (padrão: http://127.0.0.1:3030)
  ${paint(C.gray, "--topic <t>")}                        Filtrar por tópico (board read)
  ${paint(C.gray, "--from <a>")}                         Filtrar por agente (board read)
  ${paint(C.gray, "--status <s>")}                       Filtrar por status (task list)
  ${paint(C.gray, "--domain <d>")}                       Domain (task add, agent spawn)
  ${paint(C.gray, "--full")}                             Output completo (status)
`);
}

// ─── Router ───────────────────────────────────────────────────────────────────

if (!command || command === "help" || flags.help) {
  printHelp();
  process.exit(0);
}

try {
  let mod;
  switch (command) {
    case "status":
      mod = await import(`${__dir}/commands/status.mjs`);
      break;
    case "agent":
      mod = await import(`${__dir}/commands/agent.mjs`);
      break;
    case "board":
      mod = await import(`${__dir}/commands/board.mjs`);
      break;
    case "task":
      mod = await import(`${__dir}/commands/task.mjs`);
      break;
    case "hive":
      mod = await import(`${__dir}/commands/hive.mjs`);
      break;
    case "chat":
      mod = await import(`${__dir}/commands/chat.mjs`);
      break;
    default:
      console.error(`${paint(C.red, `✗ Comando desconhecido: "${command}"`)}  Execute ${paint(C.lime, "mc help")} para ver os comandos disponíveis.`);
      process.exit(1);
  }
  await mod.run(rest, flags);
} catch (e) {
  console.error(paint(C.red, `✗ ${e.message}`));
  if (flags.debug) console.error(e.stack);
  process.exit(1);
}
