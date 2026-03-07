/**
 * mc agent <subcommand> [args] [--flags]
 *
 * Subcommands:
 *   list
 *   show <id>
 *   spawn <soul> <mission> [--provider <p>] [--model <m>] [--domain <d>]
 *   stop <id>
 *   talk <id> <message...>
 *   skill add <id> <skill>
 *   skill rm <id> <skill>
 *   redirect <id> <provider> <model>
 *   close <id>
 */
import { C, api, apiPost, apiPatch, apiDel, statusDot, bar, barColored, fmtTs, paint, kv, section } from "../mc.mjs";

export async function run(args, flags) {
  const [sub, ...rest] = args;

  switch (sub) {
    case "list":   return cmdList(flags);
    case "show":   return cmdShow(rest[0], flags);
    case "spawn":  return cmdSpawn(rest, flags);
    case "stop":   return cmdStop(rest[0]);
    case "talk":   return cmdTalk(rest[0], rest.slice(1).join(" "), flags);
    case "skill":  return cmdSkill(rest, flags);
    case "redirect": return cmdRedirect(rest[0], rest[1], rest[2]);
    case "close":  return cmdClose(rest[0]);
    case "memory": return cmdMemory(rest[0]);
    default:
      console.error(`${paint(C.red, "✗")} Subcomando desconhecido: "${sub ?? "(nenhum)"}"`);
      console.error(`  Tente: list · show · spawn · stop · talk · skill · redirect · close · memory`);
      process.exit(1);
  }
}

// ── mc agent list ─────────────────────────────────────────────────────────────

async function cmdList(flags) {
  const agents = await api("/hive/agents");
  if (!agents.length) {
    console.log(paint(C.gray, "\n  — nenhum agente registrado —\n"));
    return;
  }
  section("AGENTES");
  for (const a of agents) {
    const dot    = statusDot(a.status);
    const type   = a.type === "zambia" ? paint(C.cyan, "zambia") : paint(C.gray, "native");
    const name   = paint(C.white + C.bold, (a.name ?? a.chatKey).padEnd(22));
    const id     = paint(C.gray, a.id);
    const domain = paint(C.gray, (a.domain ?? "—").padEnd(12));
    const prov   = a.providerID
      ? `${paint(C.yellow, a.providerID)} / ${paint(C.white, a.modelID ?? "?")}`
      : paint(C.gray, "—");
    console.log(`  ${dot} ${name} ${id}`);
    console.log(`     ${type.padEnd(8)}  domain: ${domain}  ${prov}`);
    if (Array.isArray(a.skills) && a.skills.length > 0) {
      console.log(`     ${paint(C.gray, "skills:")} ${a.skills.map(s => paint(C.lime, s)).join(" · ")}`);
    }
    if (a.soul) console.log(`     ${paint(C.gray, "soul:")} ${a.soul}`);
    if (a.mission) console.log(`     ${paint(C.gray, "mission:")} ${a.mission.slice(0, 70)}`);
  }
  console.log("");
}

// ── mc agent show <id> ────────────────────────────────────────────────────────

async function cmdShow(id, flags) {
  if (!id) { console.error(paint(C.red, "✗ id requerido")); process.exit(1); }

  // Try to find agent by id or chatKey
  const agents = await api("/hive/agents");
  const agt    = agents.find(a => a.id === id || a.chatKey === id || a.name?.toLowerCase() === id.toLowerCase());
  if (!agt) { console.error(paint(C.red, `✗ Agente "${id}" não encontrado`)); process.exit(1); }

  // Try to load enriched (with character)
  let enriched = agt;
  try { enriched = await api(`/hive/agents/${agt.id}`); } catch {}

  const char = enriched.character ?? {};
  const agentColor = char.color ?? C.lime;

  // ── Header ──
  console.log(`\n╔${"═".repeat(52)}╗`);
  const glyph = char.glyph ?? "◈";
  const nLine = ` ${glyph}  ${paint(C.bold + agentColor, (char.name ?? agt.name ?? agt.chatKey).toUpperCase())}`;
  console.log(`║${nLine}${" ".repeat(Math.max(1, 52 - stripAnsi(nLine).length))}║`);
  if (char.title) {
    const tLine = `    ${paint(C.gray, char.title)}`;
    console.log(`║${tLine}${" ".repeat(Math.max(1, 52 - stripAnsi(tLine).length))}║`);
  }
  console.log(`╠${"═".repeat(52)}╣`);

  // ── Base attributes ──
  if (char.attributes) {
    console.log(`║  ${paint(C.bold, "// Atributos")}${" ".repeat(38)}║`);
    for (const [attr, val] of Object.entries(char.attributes)) {
      const b    = barColored(val, 100, 18);
      const line = `  ${paint(C.white, attr.padEnd(4))}  ${b}  ${paint(C.white, String(val).padStart(3))}/100`;
      console.log(`║${line}${" ".repeat(Math.max(1, 52 - stripAnsi(line).length))}║`);
    }
  }

  // ── Special ──
  if (char.special) {
    console.log(`╠${"═".repeat(52)}╣`);
    const sp   = char.special;
    const b    = barColored(sp.value ?? 100, 100, 18);
    const line = `  ${paint(C.gold + C.bold, (sp.name ?? "SPECIAL").padEnd(8))}  ${b}  ${paint(C.gold, String(sp.value ?? 100))}`;
    console.log(`║${line}${" ".repeat(Math.max(1, 52 - stripAnsi(line).length))}║`);
    if (sp.description) {
      const dl = `  ${paint(C.gray, sp.description.slice(0, 48))}`;
      console.log(`║${dl}${" ".repeat(Math.max(1, 52 - stripAnsi(dl).length))}║`);
    }
  }

  // ── Resistances ──
  if (char.resistances) {
    console.log(`╠${"═".repeat(52)}╣`);
    console.log(`║  ${paint(C.bold, "// Resistências")}${" ".repeat(35)}║`);
    for (const [k, v] of Object.entries(char.resistances)) {
      const b    = barColored(v, 100, 14);
      const line = `  ${paint(C.gray, k.replace(/_/g, " ").slice(0, 14).padEnd(14))}  ${b}  ${paint(C.white, String(v))}`;
      console.log(`║${line}${" ".repeat(Math.max(1, 52 - stripAnsi(line).length))}║`);
    }
  }

  // ── Skills & Soul ──
  console.log(`╠${"═".repeat(52)}╣`);
  const soul   = agt.soul ?? "—";
  const skills = Array.isArray(agt.skills) && agt.skills.length > 0 ? agt.skills.join(" · ") : "—";
  const sl     = `  ${paint(C.gray, "soul:")}   ${soul}`;
  const skl    = `  ${paint(C.gray, "skills:")} ${paint(C.lime, skills)}`;
  console.log(`║${sl}${" ".repeat(Math.max(1, 52 - stripAnsi(sl).length))}║`);
  console.log(`║${skl}${" ".repeat(Math.max(1, 52 - stripAnsi(skl).length))}║`);

  // ── Runtime ──
  console.log(`╠${"═".repeat(52)}╣`);
  const s     = agt.stats ?? {};
  const stats = `  msgs:${s.messages_sent ?? 0}  tokens:${s.tokens_used ?? 0}  cost:$${(s.cost_usd ?? 0).toFixed(4)}`;
  const dot   = statusDot(agt.status);
  const stl   = `  ${dot}  ${paint(C.white, agt.status ?? "idle")}  ${paint(C.gray, `provider: ${agt.providerID ?? "—"} / ${agt.modelID ?? "—"}`)}`;
  console.log(`║${stl}${" ".repeat(Math.max(1, 52 - stripAnsi(stl).length))}║`);
  console.log(`║${stats}${" ".repeat(Math.max(1, 52 - stripAnsi(stats).length))}║`);
  if (agt.mission) {
    const ml = `  ${paint(C.gray, "mission:")} ${agt.mission.slice(0, 42)}`;
    console.log(`║${ml}${" ".repeat(Math.max(1, 52 - stripAnsi(ml).length))}║`);
  }
  if (char.weakness) {
    console.log(`╠${"═".repeat(52)}╣`);
    const wl = `  ${paint(C.red, "⚠")} ${paint(C.italic, char.weakness.slice(0, 50))}`;
    console.log(`║${wl}${" ".repeat(Math.max(1, 52 - stripAnsi(wl).length))}║`);
  }
  console.log(`╚${"═".repeat(52)}╝\n`);
}

// ── mc agent spawn <soul> <mission> ──────────────────────────────────────────

async function cmdSpawn(args, flags) {
  const [soul, ...missionParts] = args;
  const mission = missionParts.join(" ");
  if (!soul || !mission) {
    console.error(paint(C.red, "✗ Uso: mc agent spawn <soul> <missão>"));
    process.exit(1);
  }
  const soulFile = soul.includes("/") ? soul : `souls/${soul}.yaml`;
  const chatKey  = `agt-${Date.now().toString(36)}`;
  const body = {
    name:       flags.name ?? `Zambia-${chatKey.slice(-6)}`,
    type:       "zambia",
    chatKey,
    soul:       soulFile,
    mission,
    domain:     flags.domain ?? "execution",
    providerID: flags.provider ?? null,
    modelID:    flags.model ?? null,
  };
  const agt = await apiPost("/hive/agents", body);
  console.log(paint(C.lime, `✓ Zambia spawned`));
  kv("id",       agt.id);
  kv("chatKey",  agt.chatKey);
  kv("soul",     agt.soul);
  kv("mission",  mission.slice(0, 70));
  console.log("");
}

// ── mc agent stop <id> ────────────────────────────────────────────────────────

async function cmdStop(id) {
  if (!id) { console.error(paint(C.red, "✗ id requerido")); process.exit(1); }
  const agt = await _resolveAgent(id);
  await apiPost(`/stop/${encodeURIComponent(agt.chatKey)}`, {});
  console.log(paint(C.lime, `✓ Chat do agente "${agt.name ?? agt.chatKey}" parado`));
}

// ── mc agent talk <id> <message> ─────────────────────────────────────────────

async function cmdTalk(id, message, flags) {
  if (!id || !message) {
    console.error(paint(C.red, "✗ Uso: mc agent talk <id> <mensagem>"));
    process.exit(1);
  }
  const agt = await _resolveAgent(id);
  if (!agt.providerID || !agt.modelID) {
    console.error(paint(C.red, `✗ Agente "${agt.name}" não tem provider/model configurado. Use mc agent redirect <id> <provider> <model>`));
    process.exit(1);
  }

  // Get current message count
  const hist  = await api(`/chat/${encodeURIComponent(agt.chatKey)}`).catch(() => ({ messages: [] }));
  const before = hist.messages?.length ?? 0;

  // Send message
  await apiPost("/chat", {
    chatKey:    agt.chatKey,
    providerID: flags.provider ?? agt.providerID,
    modelID:    flags.model    ?? agt.modelID,
    agent:      agt.chatKey,
    text:       message,
  });

  console.log(`${paint(C.lime, "→")} ${paint(C.gray, `[${agt.name ?? agt.chatKey}]`)} ${message}`);
  process.stdout.write(`${paint(C.gray, "  aguardando resposta")} `);

  // Poll for response
  const timeout = Date.now() + 90_000;
  while (Date.now() < timeout) {
    await sleep(600);
    process.stdout.write(".");
    try {
      const h = await api(`/chat/${encodeURIComponent(agt.chatKey)}`);
      const msgs = h.messages ?? [];
      if (msgs.length > before) {
        const last = msgs.slice(before).filter(m => m.role === "assistant").pop();
        if (last) {
          process.stdout.write("\n\n");
          console.log(`${paint(C.cyan, `◈ [${agt.name ?? agt.chatKey}]`)}`);
          console.log(last.text ?? "(sem texto)");
          console.log("");
          return;
        }
      }
    } catch {}
  }
  process.stdout.write("\n");
  console.error(paint(C.red, "✗ Timeout aguardando resposta"));
  process.exit(1);
}

// ── mc agent skill add/rm <id> <skill> ───────────────────────────────────────

async function cmdSkill(args, flags) {
  const [op, id, skill] = args;
  if (!op || !id || !skill || !["add", "rm"].includes(op)) {
    console.error(paint(C.red, "✗ Uso: mc agent skill add|rm <id> <skill>"));
    process.exit(1);
  }
  const agt    = await _resolveAgent(id);
  const skills = Array.isArray(agt.skills) ? [...agt.skills] : [];
  if (op === "add" && !skills.includes(skill)) skills.push(skill);
  if (op === "rm")  skills.splice(skills.indexOf(skill), 1);
  await apiPatch(`/hive/agents/${agt.id}`, { skills });
  const verb = op === "add" ? "adicionada" : "removida";
  console.log(paint(C.lime, `✓ Skill "${skill}" ${verb}. Skills atuais: [${skills.join(", ")}]`));
}

// ── mc agent redirect <id> <provider> <model> ─────────────────────────────────

async function cmdRedirect(id, provider, model) {
  if (!id || !provider || !model) {
    console.error(paint(C.red, "✗ Uso: mc agent redirect <id> <provider> <model>"));
    process.exit(1);
  }
  const agt = await _resolveAgent(id);
  await apiPatch(`/hive/agents/${agt.id}`, { providerID: provider, modelID: model });
  console.log(paint(C.lime, `✓ Agente "${agt.name ?? agt.id}" redirecionado → ${provider}/${model}`));
}

// ── mc agent close <id> ───────────────────────────────────────────────────────

async function cmdClose(id) {
  if (!id) { console.error(paint(C.red, "✗ id requerido")); process.exit(1); }
  const agt = await _resolveAgent(id);
  if (agt.type === "native") {
    // Just mark done
    await apiPatch(`/hive/agents/${agt.id}`, { status: "done" });
    console.log(paint(C.lime, `✓ Agente nativo "${agt.name}" marcado como done`));
  } else {
    await apiDel(`/hive/agents/${agt.id}`);
    console.log(paint(C.lime, `✓ Zambia "${agt.name ?? agt.id}" encerrado e removido do hive`));
  }
}

// ── mc agent memory <id> ──────────────────────────────────────────────────────

async function cmdMemory(id) {
  if (!id) { console.error(paint(C.red, "✗ id requerido")); process.exit(1); }
  const agt = await _resolveAgent(id);
  const mem = await api(`/hive/agents/${agt.id}/memory`);

  section(`MEMÓRIA: ${mem.name ?? agt.id}`);
  kv("agent_id",   mem.agent_id);
  kv("msgs",       String(mem.message_count));
  kv("tokens",     String(mem.stats?.tokens_used ?? 0));
  kv("uptime",     mem.stats?.uptime_ms ? `${Math.round(mem.stats.uptime_ms / 60000)}m` : "—");
  kv("qdrant",     mem.qdrant_collection ?? paint(C.gray, "não configurado"));
  kv("summary",    mem.summary_exists
    ? paint(C.lime, `✓ ${mem.summary_file}`)
    : paint(C.gray, "sem sumário — agente não encerrou formalmente"));

  if (mem.summary) {
    console.log(`\n  ${paint(C.bold, "Sumário:")}`);
    console.log(mem.summary.split("\n").map(l => "  " + l).join("\n"));
  }

  if (mem.last_message) {
    const m = mem.last_message;
    console.log(`\n  ${paint(C.bold, "Última mensagem:")} ${paint(C.gray, m.role)} ${paint(C.gray, m.ts ?? "")}`);
    console.log("  " + (m.text ?? "").slice(0, 120));
  }
  console.log("");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _resolveAgent(id) {
  const agents = await api("/hive/agents");
  const agt    = agents.find(a =>
    a.id === id ||
    a.chatKey === id ||
    a.name?.toLowerCase() === id.toLowerCase()
  );
  if (!agt) {
    console.error(paint(C.red, `✗ Agente "${id}" não encontrado`));
    process.exit(1);
  }
  return agt;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Strip ANSI codes for length calculation
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ""); }
