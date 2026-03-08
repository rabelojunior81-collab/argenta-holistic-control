#!/usr/bin/env node
/**
 * setup.mjs — Holistic Mission Control · First-Run Setup Wizard
 *
 * Configura config/orchestrator.json e config/providers.json
 * interativamente, guiando o usuário pelas primeiras decisões.
 *
 * Uso: node setup.mjs
 */

import { createInterface }         from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname }           from "node:path";
import { fileURLToPath }           from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const CFG_DIR   = join(__dir, "config");
const ORCH_FILE = join(CFG_DIR, "orchestrator.json");
const PROV_FILE = join(CFG_DIR, "providers.json");

// ── ANSI palette ──────────────────────────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  gold:   "\x1b[38;5;221m",
  lime:   "\x1b[38;5;155m",
  cyan:   "\x1b[96m",
  gray:   "\x1b[38;5;240m",
  white:  "\x1b[97m",
  red:    "\x1b[38;5;203m",
  green:  "\x1b[38;5;114m",
};
const p  = (c, t) => `${c}${t}${C.reset}`;
const ok = (t)    => console.log(p(C.green,  `  ✓ ${t}`));
const warn= (t)   => console.log(p(C.gold,   `  ⚠ ${t}`));
const err = (t)   => console.log(p(C.red,    `  ✗ ${t}`));
const sep = ()    => console.log(p(C.gray,   "  " + "─".repeat(52)));

// ── Readline helper ───────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def) => new Promise(resolve => {
  const hint = def ? p(C.dim, ` [${def}]`) : "";
  rl.question(p(C.cyan, `  ? `) + q + hint + ": ", ans => {
    resolve(ans.trim() || def || "");
  });
});

// ── Kilo connection test ──────────────────────────────────────────────────────
async function testKilo(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/provider`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, providers: [] };
    const data = await res.json();
    const connected = Array.isArray(data.connected) ? data.connected : [];
    return { ok: true, providers: connected, all: data.all ?? [] };
  } catch {
    return { ok: false, providers: [] };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("");
  console.log(p(C.gold, C.bold + "  ┌─────────────────────────────────────────────────┐"));
  console.log(p(C.gold, "  │") + p(C.white, C.bold + "   HOLISTIC MISSION CONTROL                      ") + p(C.gold, "│"));
  console.log(p(C.gold, "  │") + p(C.lime,  "   First-Run Setup Wizard                        ") + p(C.gold, "│"));
  console.log(p(C.gold, "  └─────────────────────────────────────────────────┘"));
  console.log("");
  console.log(p(C.gray, "  Este wizard configura sua instância do Mission Control."));
  console.log(p(C.gray, "  Pressione Enter para aceitar o valor padrão [entre colchetes]."));
  console.log("");

  // Carrega config existente se houver
  let existing = {};
  if (existsSync(ORCH_FILE)) {
    try { existing = JSON.parse(readFileSync(ORCH_FILE, "utf8")); } catch {}
    warn("config/orchestrator.json encontrado — valores atuais serão usados como padrão.");
    console.log("");
  }

  sep();
  console.log(p(C.white, C.bold + "\n  IDENTIDADE DA COLMEIA\n"));

  const hive_name    = await ask("Nome da colmeia (ex: Argenta Fênix, My AI Hive)", existing.hive_name   ?? "My Hive");
  const orchestrator = await ask("Nome da orquestradora/IA principal (ex: Argenta)", existing.orchestrator ?? "Aria");
  const operator     = await ask("Nome do operador humano (ex: Adilson)",             existing.operator     ?? "Operator");
  const tagline      = await ask("Tagline (aparece no boot screen)",
                                  existing.tagline ?? `${hive_name} · Hive Orchestration Platform`);

  sep();
  console.log(p(C.white, C.bold + "\n  SERVIDOR\n"));

  const portStr  = await ask("Porta do Mission Control", String(existing.port ?? 3030));
  const port     = parseInt(portStr, 10) || 3030;
  const kilo_url = await ask("URL do Kilo Code", existing.kilo_url ?? "http://localhost:4096");

  sep();
  console.log(p(C.white, C.bold + "\n  VERIFICANDO KILO CODE\n"));
  console.log(p(C.gray,  `  Conectando em ${kilo_url}...`));

  const kiloResult = await testKilo(kilo_url);
  if (kiloResult.ok) {
    ok(`Kilo online — ${kiloResult.providers.length} provider(s) autenticado(s)`);
    if (kiloResult.providers.length > 0) {
      console.log(p(C.gray, `  Providers: ${kiloResult.providers.join(", ")}`));
    }
  } else {
    warn("Kilo não acessível agora — isso é OK, inicie com `kilo serve` antes do Mission Control.");
  }

  sep();
  console.log(p(C.white, C.bold + "\n  PROVIDERS (display names)\n"));
  console.log(p(C.gray,  "  Configure nomes amigáveis para seus providers."));
  console.log(p(C.gray,  "  Deixe em branco para usar o ID como nome."));
  console.log("");

  // Se Kilo está online, sugere os providers conectados; senão usa lista vazia
  const knownProviders = kiloResult.ok && kiloResult.providers.length > 0
    ? kiloResult.providers
    : ["kilo", "openai", "github-copilot", "kimi-for-coding", "bailian-coding-plan"];

  let existingDisplay = {};
  try {
    const pCfg = JSON.parse(readFileSync(PROV_FILE, "utf8"));
    existingDisplay = pCfg.display ?? {};
  } catch {}

  const display = {};
  for (const id of knownProviders) {
    const def  = existingDisplay[id] ?? id;
    const name = await ask(`  ${id}`, def);
    if (name && name !== id) display[id] = name;
  }

  sep();
  console.log("");

  // Monta e salva os arquivos de config
  const orchCfg = { hive_name, orchestrator, operator, tagline, port, kilo_url, locale: existing.locale ?? "en" };
  const provCfg = {
    _comment: "Display names for Kilo providers. Add/edit as needed.",
    display,
  };

  writeFileSync(ORCH_FILE, JSON.stringify(orchCfg, null, 2) + "\n");
  writeFileSync(PROV_FILE, JSON.stringify(provCfg, null, 2) + "\n");

  ok("config/orchestrator.json gravado");
  ok("config/providers.json gravado");
  console.log("");
  console.log(p(C.gold, C.bold + "  Setup concluído!"));
  console.log("");
  console.log(p(C.white, "  Próximos passos:"));
  console.log(p(C.gray,  `  1. Inicie o Kilo Code:  kilo serve`));
  console.log(p(C.gray,  `  2. Inicie o Mission Control:`));
  console.log(p(C.lime,  `       node start.mjs`));
  console.log(p(C.gray,  `     ou (Windows):`));
  console.log(p(C.lime,  `       start-mc.bat`));
  console.log(p(C.gray,  `  3. Abra no browser:     http://localhost:${port}`));
  console.log("");

  rl.close();
}

main().catch(e => { err(e.message); rl.close(); process.exit(1); });
