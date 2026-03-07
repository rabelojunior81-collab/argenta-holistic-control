/**
 * mc board <subcommand> [args] [--flags]
 *
 * Subcommands:
 *   read  [--topic <t>] [--from <a>] [--n <n>]
 *   post  <topic> <content...>
 *   reply <msg-id> <content...>
 *   mark-read <msg-id>
 *   delete <msg-id>
 */
import { C, api, apiPost, apiPatch, apiDel, fmtTs, paint, section, topicColor } from "../mc.mjs";

export async function run(args, flags) {
  const [sub, ...rest] = args;

  switch (sub) {
    case "read":      return cmdRead(flags);
    case "post":      return cmdPost(rest[0], rest.slice(1).join(" "), flags);
    case "reply":     return cmdReply(rest[0], rest.slice(1).join(" "), flags);
    case "mark-read": return cmdMarkRead(rest[0]);
    case "delete":    return cmdDelete(rest[0]);
    default:
      if (!sub) return cmdRead(flags); // default: read
      console.error(`${paint(C.red, "✗")} Subcomando: "${sub}" desconhecido. Tente: read · post · reply · mark-read · delete`);
      process.exit(1);
  }
}

// ── mc board read ─────────────────────────────────────────────────────────────

async function cmdRead(flags) {
  const n     = flags.n ? parseInt(flags.n) : 20;
  let   query = `?n=${n}`;
  if (flags.topic)  query += `&topic=${encodeURIComponent(flags.topic)}`;
  if (flags.from)   query += `&from=${encodeURIComponent(flags.from)}`;
  if (flags.thread) query += `&thread=${encodeURIComponent(flags.thread)}`;

  const msgs = await api(`/bus${query}`);
  if (!msgs.length) {
    console.log(paint(C.gray, "\n  — bulletin board vazio —\n"));
    return;
  }

  const filterInfo = [
    flags.topic  ? `topic: ${flags.topic}` : null,
    flags.from   ? `from: ${flags.from}`   : null,
    flags.thread ? `thread: ${flags.thread}` : null,
  ].filter(Boolean).join(" · ");

  section(`BULLETIN BOARD${filterInfo ? `  (${filterInfo})` : ""}  [${msgs.length} msgs]`);

  for (const m of msgs) {
    _renderMsg(m, flags.full);
  }
  console.log("");
}

// ── mc board post <topic> <content> ──────────────────────────────────────────

async function cmdPost(topic, content, flags) {
  if (!topic || !content) {
    console.error(paint(C.red, "✗ Uso: mc board post <topic> <conteúdo>"));
    console.error(paint(C.gray, "  Tópicos: orchestration · debug · brainstorm · task-result · request-skill · request-agent · heartbeat · memory · alert"));
    process.exit(1);
  }
  const body = {
    from:    flags.from   ?? "human",
    to:      flags.to     ?? "broadcast",
    topic,
    thread:  flags.thread ?? null,
    content,
  };
  const msg = await apiPost("/bus", body);
  console.log(paint(C.lime, `✓ Mensagem postada`));
  console.log(`  ${paint(C.gray, "id:")}     ${msg.id}`);
  console.log(`  ${paint(C.gray, "topic:")}  ${topicColor(msg.topic)}`);
  console.log(`  ${paint(C.gray, "from:")}   ${msg.from}`);
  console.log(`  ${paint(C.gray, "ts:")}     ${fmtTs(msg.ts)}`);
  console.log("");
}

// ── mc board reply <msg-id> <content> ────────────────────────────────────────

async function cmdReply(msgId, content, flags) {
  if (!msgId || !content) {
    console.error(paint(C.red, "✗ Uso: mc board reply <msg-id> <conteúdo>"));
    process.exit(1);
  }
  const reply = await apiPost(`/bus/${msgId}/reply`, {
    from:    flags.from ?? "human",
    content,
  });
  console.log(paint(C.lime, `✓ Reply adicionado`));
  console.log(`  ${paint(C.gray, "id:")}   ${reply.id}`);
  console.log(`  ${paint(C.gray, "from:")} ${reply.from}`);
  console.log(`  ${paint(C.gray, "ts:")}   ${fmtTs(reply.ts)}`);
  console.log("");
}

// ── mc board mark-read <msg-id> ───────────────────────────────────────────────

async function cmdMarkRead(msgId) {
  if (!msgId) { console.error(paint(C.red, "✗ msg-id requerido")); process.exit(1); }
  await apiPatch(`/bus/${msgId}`, { status: "read" });
  console.log(paint(C.lime, `✓ Mensagem "${msgId}" marcada como lida`));
}

// ── mc board delete <msg-id> ──────────────────────────────────────────────────

async function cmdDelete(msgId) {
  if (!msgId) { console.error(paint(C.red, "✗ msg-id requerido")); process.exit(1); }
  await apiDel(`/bus/${msgId}`);
  console.log(paint(C.lime, `✓ Mensagem "${msgId}" removida do bus`));
}

// ── Render helpers ────────────────────────────────────────────────────────────

function _renderMsg(m, full = false) {
  const topic   = topicColor(m.topic ?? "?");
  const from    = paint(C.lime,  m.from ?? "?");
  const to      = m.to && m.to !== "broadcast"
    ? ` ${paint(C.gray, "→")} ${paint(C.white, m.to)}`
    : "";
  const ts      = paint(C.gray, fmtTs(m.ts));
  const id      = paint(C.gray, m.id);
  const status  = m.status === "unread"  ? paint(C.yellow, "●") : paint(C.gray, "○");
  const thread  = m.thread ? ` ${paint(C.gray, `⤷ ${m.thread}`)}` : "";

  console.log(`\n  ${status} ${id}  ${topic}  ${from}${to}${thread}  ${ts}`);
  if (full) {
    // Wrap long content
    const lines = (m.content ?? "").split("\n");
    for (const line of lines) {
      console.log(`    ${line}`);
    }
  } else {
    const preview = (m.content ?? "").slice(0, 90).replace(/\n/g, " ");
    console.log(`    ${preview}${m.content?.length > 90 ? paint(C.gray, "…") : ""}`);
  }

  // Show replies
  const replies = m.replies ?? [];
  if (replies.length > 0) {
    console.log(`    ${paint(C.gray, `↩ ${replies.length} resposta(s)`)}`);
    if (full) {
      for (const r of replies) {
        console.log(`      ${paint(C.lime, r.from)}  ${paint(C.gray, fmtTs(r.ts))}`);
        console.log(`      ${r.content.slice(0, 80)}`);
      }
    }
  }
}
