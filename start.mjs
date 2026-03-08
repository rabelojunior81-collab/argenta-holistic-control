#!/usr/bin/env node
/**
 * start.mjs — Mission Control Process Orchestrator
 * Inicia todos os serviços em ordem, com saída consolidada e kill gracioso.
 *
 * Ordem: ui → loop → (futuros: qdrant-check, ollama-check, etc.)
 * Uso: node start.mjs  |  npm start
 */

import { spawn }     from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync }    from "node:fs";
import { join, dirname }   from "node:path";
import { fileURLToPath }   from "node:url";

const __dir   = dirname(fileURLToPath(import.meta.url));
function loadCfg(path, fb = {}) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fb; }
}
const ORCH = loadCfg(join(__dir, "config/orchestrator.json"), {
  hive_name: "Mission Control", orchestrator: "Argenta",
});

// ── ANSI palette ──────────────────────────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  lime:   "\x1b[38;5;155m",
  olive:  "\x1b[38;5;107m",
  gold:   "\x1b[38;5;221m",
  red:    "\x1b[38;5;203m",
  gray:   "\x1b[38;5;240m",
  white:  "\x1b[97m",
  cyan:   "\x1b[96m",
};
const paint = (c, t) => `${c}${t}${C.reset}`;
const ts    = () => new Date().toLocaleTimeString("pt-BR", { hour12: false });

// ── Process definitions ───────────────────────────────────────────────────────
const SERVICES = [
  {
    id:      "ui",
    label:   "Mission Control UI",
    cmd:     "node",
    args:    ["ui/server.mjs"],
    color:   C.lime,
    ready:   /Mission Control|3030|ouvindo|listening/i,
    primary: true,   // saída deste serviço encerra todos os outros
    delay:   0,
  },
  {
    id:      "loop",
    label:   "Ralph Loop",
    cmd:     "node",
    args:    ["ralph-loop/index.mjs"],
    color:   C.gold,
    ready:   /loop|tick|started|iniciando|ralph/i,
    primary: false,
    delay:   1200,   // aguarda UI estar completamente pronto
  },
];

// ── State ─────────────────────────────────────────────────────────────────────
const procs = new Map();
let shuttingDown = false;

// ── Logging helpers ───────────────────────────────────────────────────────────
function log(svcColor, svcId, msg) {
  const prefix = paint(C.gray, `[${ts()}]`) + " " +
                 paint(svcColor, `[${svcId.toUpperCase().padEnd(6)}]`);
  process.stdout.write(`${prefix} ${msg}\n`);
}

function banner() {
  console.log("");
  console.log(paint(C.lime, C.bold + "  ╔══════════════════════════════════════════╗"));
  console.log(paint(C.lime, "  ║") + paint(C.white, C.bold + `   MISSION CONTROL — ${ORCH.hive_name.toUpperCase().padEnd(21)}`) + paint(C.lime, "║"));
  console.log(paint(C.lime, "  ║") + paint(C.olive, "   Process Orchestrator  v1.0               ") + paint(C.lime, "║"));
  console.log(paint(C.lime, "  ╚══════════════════════════════════════════╝"));
  console.log("");
  console.log(paint(C.gray, `  Iniciando ${SERVICES.length} serviço(s)... Ctrl+C para encerrar tudo.`));
  console.log("");
}

// ── Spawn a service ───────────────────────────────────────────────────────────
function startService(svc) {
  return new Promise((resolve) => {
    log(svc.color, svc.id, paint(C.dim, `iniciando: ${svc.cmd} ${svc.args.join(" ")}`));

    const child = spawn(svc.cmd, svc.args, {
      cwd:   process.cwd(),
      env:   { ...process.env, FORCE_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    procs.set(svc.id, child);

    // Pipe stdout
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      log(svc.color, svc.id, paint(C.gray, line));
      if (!child._ready && svc.ready?.test(line)) {
        child._ready = true;
        log(svc.color, svc.id, paint(C.lime, `✓ pronto`));
        resolve(child);
      }
    });

    // Pipe stderr
    const rle = createInterface({ input: child.stderr });
    rle.on("line", (line) => {
      log(svc.color, svc.id, paint(C.red, line));
    });

    child.on("exit", (code, signal) => {
      if (shuttingDown) return;
      if (svc.primary) {
        // Serviço primário saiu — encerra tudo em cascata
        if (code === 0) {
          log(svc.color, svc.id, paint(C.lime, `encerrado graciosamente`));
          shutdown("EXIT");
        } else {
          log(svc.color, svc.id, paint(C.red, `encerrado inesperadamente (code=${code ?? signal})`));
          shutdown("CRASH");
        }
      } else {
        // Serviço secundário — apenas loga, não derruba os demais
        log(svc.color, svc.id, paint(C.gold, `encerrado (code=${code ?? signal}) — outros serviços continuam`));
      }
    });

    // Fallback: resolve após 4s mesmo sem ready pattern
    setTimeout(() => {
      if (!child._ready) {
        child._ready = true;
        log(svc.color, svc.id, paint(C.gold, `▸ em execução (sem ready signal detectado)`));
        resolve(child);
      }
    }, 4000);
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal = "SIGINT") {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("");
  console.log(paint(C.gold, `\n  [${signal}] Encerrando todos os serviços...`));

  for (const [id, child] of [...procs].reverse()) {
    if (!child.killed) {
      log(C.gray, id, paint(C.gray, "encerrando..."));
      child.kill("SIGTERM");
    }
  }

  // Aguarda até 3s
  await new Promise(r => setTimeout(r, 1500));
  for (const [, child] of procs) {
    if (!child.killed) child.kill("SIGKILL");
  }

  console.log(paint(C.olive, "\n  Mission Control encerrado. Até logo.\n"));
  process.exit(0);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGQUIT", () => shutdown("SIGQUIT"));

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  banner();

  for (const svc of SERVICES) {
    if (svc.delay) {
      await new Promise(r => setTimeout(r, svc.delay));
    }
    await startService(svc);
  }

  console.log("");
  console.log(paint(C.lime, C.bold + "  ✓ Todos os serviços ativos."));
  console.log(paint(C.olive, `  Dashboard: `) + paint(C.cyan, "http://localhost:3030"));
  console.log(paint(C.gray,  "  Ctrl+C para encerrar tudo.\n"));
}

main().catch(err => {
  console.error(paint(C.red, `\n  ERRO FATAL: ${err.message}`));
  process.exit(1);
});
