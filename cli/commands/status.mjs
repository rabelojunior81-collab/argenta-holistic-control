/**
 * mc status [--full]
 * Visão geral do hive: kilo health, tasks, agentes, últimas mensagens do bus
 */
import { C, api, statusDot, bar, barColored, fmtTs, paint, kv, section } from "../mc.mjs";

export async function run(args, flags) {
  const full = flags.full ?? false;

  const [health, agents, tasks, bus] = await Promise.all([
    api("/health").catch(() => ({})),
    api("/hive/agents").catch(() => []),
    api("/tasks").catch(() => []),
    api("/bus?n=5").catch(() => []),
  ]);

  const kilo    = health?.kilo_serve ?? {};
  const pending = tasks.filter(t => t.status === "pending").length;
  const active  = tasks.filter(t => t.status === "in_progress").length;
  const done    = tasks.filter(t => t.status === "done").length;
  const blocked = tasks.filter(t => t.status === "blocked").length;
  const zombie  = agents.filter(a => a.status === "zombie").length;

  // ── Header ──
  console.log(`\n${paint(C.bold + C.lime, "◈ MISSION CONTROL")} · ${paint(C.yellow, "Argenta Fênix")}`);
  const kiloStr = kilo.ok
    ? paint(C.lime,  `✓ online  ${paint(C.gray, kilo.url ?? "")}`)
    : paint(C.red,   `✗ offline ${paint(C.gray, kilo.error ?? "")}`);
  console.log(`  ${paint(C.gray, "kilo-serve")}   ${kiloStr}`);
  console.log(`  ${paint(C.gray, "tasks")}        ${paint(C.white, String(tasks.length))} total · ${paint(C.lime, String(active))} ativas · ${paint(C.green, String(done))} done · ${paint(C.yellow, String(pending))} pending${blocked ? " · " + paint(C.red, String(blocked)) + " blocked" : ""}`);
  if (zombie) console.log(`  ${paint(C.red, `⚠ ${zombie} agente(s) zombie detectado(s)`)}`);

  // ── Hive panel ──
  section("HIVE");
  const native  = agents.filter(a => a.type === "native");
  const zambias = agents.filter(a => a.type !== "native");

  if (native.length > 0) {
    console.log(`  ${paint(C.gray, "Nativos:")}`);
    for (const a of native) {
      _agentRow(a, full);
    }
  }

  if (zambias.length > 0) {
    console.log(`  ${paint(C.gray, "Zambias:")}`);
    for (const a of zambias) {
      _agentRow(a, full);
    }
  }

  if (agents.length === 0) {
    console.log(`  ${paint(C.gray, "— nenhum agente registrado —")}`);
  }

  // ── Active tasks ──
  const activeTasks = tasks.filter(t => t.status === "in_progress");
  if (activeTasks.length > 0) {
    section("TASKS ATIVAS");
    for (const t of activeTasks) {
      const prio = { high: paint(C.red, "↑"), medium: paint(C.yellow, "→"), low: paint(C.gray, "↓") }[t.priority] ?? "·";
      console.log(`  ${prio} ${paint(C.white, t.id)}  ${t.title.slice(0, 55)}  ${paint(C.gray, t.agent ?? t.domain ?? "")}`);
    }
  }

  // ── Recent bus messages ──
  if (bus.length > 0) {
    section("BUS RECENTE");
    for (const m of bus.slice(0, 5)) {
      const topic = paint(C.gray, `[${m.topic ?? "?"}]`);
      const from  = paint(C.lime, m.from ?? "?");
      const cont  = (m.content ?? "").slice(0, 60);
      console.log(`  ${topic} ${from}: ${cont}`);
    }
  }

  console.log("");
}

function _agentRow(a, full) {
  const dot    = statusDot(a.status);
  const type   = a.type === "zambia"  ? paint(C.cyan,  "z") : paint(C.gray, "n");
  const name   = paint(C.white, (a.name ?? a.chatKey ?? a.id).slice(0, 18).padEnd(18));
  const status = paint(C.gray, (a.status ?? "idle").padEnd(12));
  const prov   = a.providerID
    ? paint(C.gray, `${a.providerID.slice(0, 14)}/${(a.modelID ?? "").slice(0, 12)}`)
    : paint(C.gray, "—");
  const hb     = a.heartbeat ? paint(C.gray, fmtTs(a.heartbeat)) : paint(C.gray, "—");

  console.log(`  ${dot} ${type} ${name} ${status} ${prov}`);

  if (full) {
    const s = a.stats ?? {};
    const msgs   = `msgs:${s.messages_sent ?? 0}`;
    const tokens = `tokens:${s.tokens_used > 1000 ? (s.tokens_used / 1000).toFixed(1) + "k" : (s.tokens_used ?? 0)}`;
    const cost   = `cost:$${(s.cost_usd ?? 0).toFixed(4)}`;
    console.log(`    ${paint(C.gray, `${msgs}  ${tokens}  ${cost}  hb: ${hb}`)}`);
    if (a.soul) console.log(`    ${paint(C.gray, `soul: ${a.soul}`)}`);
    if (Array.isArray(a.skills) && a.skills.length > 0) {
      console.log(`    ${paint(C.gray, `skills: [${a.skills.join(", ")}]`)}`);
    }
    if (a.mission) console.log(`    ${paint(C.gray, `mission: ${a.mission.slice(0, 60)}`)}`);
  }
}
