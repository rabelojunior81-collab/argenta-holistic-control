/**
 * mc chat <agent-id> [--provider <p>] [--model <m>]
 * Chat interativo (REPL) com um agente da colmeia.
 *
 * Envia mensagens via POST /api/chat e recebe respostas por polling
 * sobre GET /api/chat/:chatKey.
 */
import readline from "node:readline";
import { C, api, apiPost, fmtTs, paint, statusDot } from "../mc.mjs";

export async function run(args, flags) {
  const agentRef = args[0];
  if (!agentRef) {
    console.error(paint(C.red, "✗ Uso: mc chat <agent-id>"));
    process.exit(1);
  }

  // ── Resolve agent ──
  const agents = await api("/hive/agents");
  const agt    = agents.find(a =>
    a.id === agentRef ||
    a.chatKey === agentRef ||
    a.name?.toLowerCase() === agentRef.toLowerCase()
  );
  if (!agt) {
    console.error(paint(C.red, `✗ Agente "${agentRef}" não encontrado`));
    console.error(`  Agentes disponíveis: ${agents.map(a => a.chatKey).join(", ")}`);
    process.exit(1);
  }

  // ── Determine provider/model ──
  const providerID = flags.provider ?? agt.providerID;
  const modelID    = flags.model    ?? agt.modelID;
  if (!providerID || !modelID) {
    console.error(paint(C.red, `✗ Agente "${agt.name}" sem provider/model configurado.`));
    console.error(`  Use: mc agent redirect ${agt.id} <provider> <model>`);
    process.exit(1);
  }

  // ── Load char for display ──
  let charName  = agt.name ?? agt.chatKey;
  let charColor = C.lime;
  let charGlyph = "◈";
  try {
    const enriched = await api(`/hive/agents/${agt.id}`);
    const c = enriched.character;
    if (c) {
      charName  = c.name ?? charName;
      charColor = c.color ?? charColor;
      charGlyph = c.glyph ?? charGlyph;
    }
  } catch {}

  // ── Load existing history ──
  let msgCountBefore = 0;
  try {
    const hist = await api(`/chat/${encodeURIComponent(agt.chatKey)}`);
    const msgs = hist.messages ?? [];
    msgCountBefore = msgs.length;

    if (msgs.length > 0) {
      console.log(`\n${paint(C.gray, "─── Histórico recente ─────────────────────────────────")}`);
      for (const m of msgs.slice(-6)) {
        const isUser = m.role === "user";
        const who    = isUser
          ? paint(C.white + C.bold, "você")
          : paint(charColor + C.bold, charGlyph + " " + charName);
        console.log(`\n${who}  ${paint(C.gray, fmtTs(m.ts))}`);
        console.log((m.text ?? "").split("\n").map(l => "  " + l).join("\n"));
      }
      console.log(paint(C.gray, "─── fim do histórico ──────────────────────────────────"));
    }
  } catch {}

  // ── REPL banner ──
  const agentLabel = `${charGlyph} ${charName}`;
  console.log(`\n${paint(charColor + C.bold, agentLabel)} ${paint(C.gray, `(${providerID}/${modelID})`)}`);
  console.log(paint(C.gray, "  /sair ou Ctrl+C para encerrar · /limpar para nova sessão\n"));

  // ── Readline setup ──
  const rl = readline.createInterface({
    input:     process.stdin,
    output:    process.stdout,
    terminal:  true,
    prompt:    paint(C.white, "  você › "),
  });

  rl.prompt();

  rl.on("line", async (input) => {
    const line = input.trim();
    if (!line) { rl.prompt(); return; }

    // ── Commands ──
    if (line === "/sair" || line === "/exit" || line === "/quit") {
      console.log(paint(C.gray, "\n  Encerrando chat. Sessão preservada no servidor.\n"));
      rl.close();
      process.exit(0);
    }

    if (line === "/limpar" || line === "/clear") {
      await fetch(`${(await import("../mc.mjs")).API}/chat/${encodeURIComponent(agt.chatKey)}`,
        { method: "DELETE" }).catch(() => {});
      msgCountBefore = 0;
      console.log(paint(C.lime, "  ✓ Sessão de chat limpa.\n"));
      rl.prompt();
      return;
    }

    if (line === "/status") {
      const dot = statusDot(agt.status);
      console.log(`  ${dot} ${agt.name}  ${paint(C.gray, `${providerID}/${modelID}`)}\n`);
      rl.prompt();
      return;
    }

    if (line === "/help") {
      console.log(paint(C.gray, "  Comandos: /sair · /limpar · /status · /help\n"));
      rl.prompt();
      return;
    }

    // ── Send message ──
    const snapshot = msgCountBefore;
    try {
      await apiPost("/chat", {
        chatKey: agt.chatKey,
        providerID,
        modelID,
        agent:   agt.chatKey,
        text:    line,
      });
      msgCountBefore++;
    } catch (e) {
      console.error(`\n  ${paint(C.red, `✗ Erro ao enviar: ${e.message}`)}\n`);
      rl.prompt();
      return;
    }

    // ── Poll for response ──
    process.stdout.write(`\n  ${paint(charColor, charGlyph + " " + charName)} ${paint(C.gray, "está respondendo")}`);

    const timeout  = Date.now() + 90_000;
    let   answered = false;

    while (!answered && Date.now() < timeout) {
      await sleep(700);
      process.stdout.write(paint(C.gray, "."));
      try {
        const h    = await api(`/chat/${encodeURIComponent(agt.chatKey)}`);
        const msgs = h.messages ?? [];
        const news = msgs.slice(snapshot + 1).filter(m => m.role === "assistant");
        if (news.length > 0) {
          const reply = news[news.length - 1];
          process.stdout.write("\n\n");
          process.stdout.write(
            (reply.text ?? "").split("\n").map(l => "  " + l).join("\n")
          );
          process.stdout.write("\n\n");
          msgCountBefore = msgs.length;
          answered = true;
        }
      } catch {}
    }

    if (!answered) {
      process.stdout.write("\n");
      console.error(paint(C.red, "  ✗ Timeout — sem resposta em 90s\n"));
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(paint(C.gray, "\n  Chat encerrado.\n"));
    process.exit(0);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
