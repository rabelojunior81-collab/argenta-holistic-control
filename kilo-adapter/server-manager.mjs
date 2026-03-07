/**
 * Kilo Serve — Server Manager
 * Gerencia o ciclo de vida do processo `kilo serve`.
 * - isRunning(): verifica se o server já está up
 * - start(): spawna `kilo serve` e aguarda ready
 * - stop(): encerra o processo
 */

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(
  await readFile(join(__dir, "config.json"), "utf8")
);

let kiloProcess = null;

// ─── Health check ──────────────────────────────────────────────────────────────

export async function isRunning() {
  try {
    const res = await fetch(`${cfg.base_url}${cfg.health_endpoint}`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

export async function start() {
  if (await isRunning()) {
    console.log(`[kilo-manager] server already running at ${cfg.base_url}`);
    return;
  }

  console.log(`[kilo-manager] spawning: ${cfg.spawn.command} ${cfg.spawn.args.join(" ")}`);

  // No Windows, .cmd files precisam de shell:true para serem resolvidos
  const isWin = process.platform === "win32";
  kiloProcess = spawn(cfg.spawn.command, cfg.spawn.args, {
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWin,
  });

  kiloProcess.stdout.on("data", (d) =>
    process.stdout.write(`[kilo] ${d}`)
  );
  kiloProcess.stderr.on("data", (d) =>
    process.stderr.write(`[kilo-err] ${d}`)
  );

  kiloProcess.on("exit", (code) => {
    console.log(`[kilo-manager] process exited with code ${code}`);
    kiloProcess = null;
  });

  await waitReady();
  console.log(`[kilo-manager] server ready at ${cfg.base_url}`);
}

// ─── Stop ────────────────────────────────────────────────────────────────────

export async function stop() {
  if (kiloProcess) {
    kiloProcess.kill("SIGTERM");
    kiloProcess = null;
    console.log("[kilo-manager] server stopped");
  }
}

// ─── Wait ready ──────────────────────────────────────────────────────────────

async function waitReady() {
  const deadline = Date.now() + cfg.spawn.ready_timeout_ms;
  while (Date.now() < deadline) {
    if (await isRunning()) return;
    await sleep(cfg.spawn.poll_interval_ms);
  }
  throw new Error(
    `[kilo-manager] server did not become ready within ${cfg.spawn.ready_timeout_ms}ms`
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── CLI standalone ─────────────────────────────────────────────────────────

if (process.argv[2] === "start") {
  await start();
  console.log("[kilo-manager] keeping process alive. Ctrl+C to stop.");
  process.on("SIGINT", async () => {
    await stop();
    process.exit(0);
  });
  // keep alive
  setInterval(() => {}, 60_000);
}
