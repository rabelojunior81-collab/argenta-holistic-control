/**
 * mc hive <subcommand> [args] [--flags]
 *
 * Subcommands:
 *   broadcast <topic> <message...>   Posta mensagem de broadcast para todos os agentes
 *   snapshot                         Exibe estado completo do hive em JSON
 *   brainstorm <topic> [--agents <ids>] [--content <msg>]
 */
import { C, api, apiPost, fmtTs, paint, section, topicColor, statusDot, kv } from "../mc.mjs";

export async function run(args, flags) {
  const [sub, ...rest] = args;

  switch (sub) {
    case "broadcast":  return cmdBroadcast(rest[0], rest.slice(1).join(" "), flags);
    case "snapshot":   return cmdSnapshot(flags);
    case "brainstorm": return cmdBrainstorm(rest.join(" "), flags);
    default:
      console.error(`${paint(C.red, "✗")} Subcomando: "${sub ?? "(nenhum)"}". Tente: broadcast · snapshot · brainstorm`);
      process.exit(1);
  }
}

// ── mc hive broadcast <topic> <msg> ──────────────────────────────────────────

async function cmdBroadcast(topic, content, flags) {
  if (!topic || !content) {
    console.error(paint(C.red, "✗ Uso: mc hive broadcast <topic> <mensagem>"));
    process.exit(1);
  }
  const agents = await api("/hive/agents");
  const active  = agents.filter(a => a.status !== "done" && a.status !== "zombie");

  // Post to bus as broadcast
  const msg = await apiPost("/bus", {
    from:    flags.from ?? "argenta",
    to:      "broadcast",
    topic,
    content: `[BROADCAST] ${content}`,
  });

  console.log(paint(C.lime, `✓ Broadcast enviado ao bus`));
  console.log(`  ${paint(C.gray, "id:")}      ${msg.id}`);
  console.log(`  ${paint(C.gray, "topic:")}   ${topicColor(topic)}`);
  console.log(`  ${paint(C.gray, "agentes:")} ${active.length} ativos receberão`);
  for (const a of active) {
    console.log(`    ${statusDot(a.status)} ${paint(C.white, a.name ?? a.chatKey)}`);
  }
  console.log("");
}

// ── mc hive snapshot ──────────────────────────────────────────────────────────

async function cmdSnapshot(flags) {
  const [agents, tasks, health, bus] = await Promise.all([
    api("/hive/agents").catch(() => []),
    api("/tasks").catch(() => []),
    api("/health").catch(() => ({})),
    api("/bus?n=20").catch(() => []),
  ]);

  const snapshot = {
    ts:      new Date().toISOString(),
    health:  health?.kilo_serve ?? {},
    hive:    {
      total:      agents.length,
      native:     agents.filter(a => a.type === "native").length,
      zambia:     agents.filter(a => a.type === "zambia").length,
      zombie:     agents.filter(a => a.status === "zombie").length,
      in_progress:agents.filter(a => a.status === "in_progress").length,
      agents,
    },
    kanban:  {
      total:      tasks.length,
      pending:    tasks.filter(t => t.status === "pending").length,
      active:     tasks.filter(t => t.status === "in_progress").length,
      blocked:    tasks.filter(t => t.status === "blocked").length,
      done:       tasks.filter(t => t.status === "done").length,
      tasks,
    },
    bus: {
      recent: bus.length,
      messages: bus,
    },
  };

  if (flags.json) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  section(`HIVE SNAPSHOT  ${fmtTs(snapshot.ts)}`);

  kv("kilo-serve", health?.kilo_serve?.ok ? paint(C.lime, "✓ online") : paint(C.red, "✗ offline"));
  console.log("");

  kv("agentes",    `${agents.length} total · ${snapshot.hive.native} nativos · ${snapshot.hive.zambia} zambias · ${paint(snapshot.hive.zombie > 0 ? C.red : C.gray, `${snapshot.hive.zombie} zombies`)}`);
  kv("tasks",      `${tasks.length} total · ${paint(C.lime, String(snapshot.kanban.active))} ativas · ${paint(C.green, String(snapshot.kanban.done))} done · ${paint(C.yellow, String(snapshot.kanban.pending))} pending`);
  kv("bus msgs",   `${bus.length} recentes`);

  console.log(`\n  ${paint(C.bold, "Agentes:")}`);
  for (const a of agents) {
    const dot = statusDot(a.status);
    const hb  = a.heartbeat ? fmtTs(a.heartbeat) : "—";
    console.log(`    ${dot} ${paint(C.white, (a.name ?? a.id).padEnd(20))} ${paint(C.gray, hb)}`);
  }

  console.log(`\n  ${paint(C.bold, "Tasks ativas:")}`);
  const active = tasks.filter(t => t.status === "in_progress");
  if (!active.length) {
    console.log(paint(C.gray, "    — nenhuma —"));
  } else {
    for (const t of active) {
      console.log(`    ${paint(C.lime, "●")} ${t.id}  ${t.title.slice(0, 55)}  ${paint(C.gray, t.agent ?? "—")}`);
    }
  }

  console.log(`\n  ${paint(C.bold, "Últimas mensagens do bus:")}`);
  if (!bus.length) {
    console.log(paint(C.gray, "    — bus vazio —"));
  } else {
    for (const m of bus.slice(0, 5)) {
      console.log(`    ${topicColor(m.topic)}  ${paint(C.lime, m.from)}:  ${(m.content ?? "").slice(0, 60)}`);
    }
  }
  console.log("");
}

// ── mc hive brainstorm <topic> ────────────────────────────────────────────────

async function cmdBrainstorm(topic, flags) {
  if (!topic) {
    console.error(paint(C.red, "✗ Uso: mc hive brainstorm <tópico> [--content <msg>]"));
    process.exit(1);
  }

  const content = flags.content
    ?? `[BRAINSTORM] ${topic} — todos os agentes são convidados a contribuir neste thread.`;

  const threadId = `thread-brainstorm-${Date.now().toString(36)}`;
  const msg = await apiPost("/bus", {
    from:    flags.from ?? "argenta",
    to:      "broadcast",
    topic:   "brainstorm",
    thread:  threadId,
    content: `[BRAINSTORM ABERTO: ${topic}]\n\n${content}`,
  });

  console.log(paint(C.lime, `✓ Sessão de brainstorm aberta`));
  console.log(`  ${paint(C.gray, "thread:")} ${threadId}`);
  console.log(`  ${paint(C.gray, "msg-id:")} ${msg.id}`);
  console.log(`  ${paint(C.gray, "tópico:")} ${topic}`);
  console.log(`\n  Para contribuir: ${paint(C.lime, `mc board reply ${msg.id} <sua ideia>`)}`);
  console.log(`  Para ler thread: ${paint(C.lime, `mc board read --thread ${threadId}`)}`);
  console.log("");
}
