/**
 * Mission Control UI — HTTP + WebSocket server
 *
 * HTTP:
 *   GET  /                       → dashboard HTML
 *   GET  /api/state              → ops/state.json + kilo health
 *   GET  /api/tasks              → kanban/tasks.json
 *   POST /api/tasks              → adicionar task
 *   PATCH /api/tasks/:id         → mover task
 *   DELETE /api/tasks/:id        → remover task
 *   GET  /api/tasks/:id/session → sessão associada à task
 *   GET  /api/events             → últimas N linhas events.jsonl
 *   GET  /api/matrix             → expertise-matrix/matrix.yaml parseado
 *   POST /api/dispatch           → disparo manual: { provider, model, prompt }
 *   GET  /api/bus                → bus/messages.jsonl (filtros: topic, from, thread, n)
 *   POST /api/bus                → nova mensagem no bus
 *   PATCH /api/bus/:id           → atualizar status/conteúdo
 *   DELETE /api/bus/:id          → remover mensagem
 *   POST /api/bus/:id/reply      → adicionar reply a uma mensagem
 *   GET  /api/skills             → skills disponíveis (skills/*.yaml)
 *   GET  /api/skills/:name       → skill específica
 *   GET  /api/souls              → souls disponíveis (souls/*.yaml)
 *   GET  /api/souls/:name        → soul específica
 *
 * WebSocket (ws://localhost:3030):
 *   → push de novas linhas do events.jsonl em tempo real
 *   → push de state updates a cada 3s
 */

import { createServer }            from "node:http";
import { readFile, writeFile,
         appendFile, stat,
         readdir }                 from "node:fs/promises";
import { existsSync }              from "node:fs";
import { readFileSync }            from "node:fs";
import { spawn }                   from "node:child_process";
import yaml                        from "js-yaml";
import {
  initEpisodic, upsertSession,
  queryMemory,  syncPendingCache,
  getStats as getEpisodicStats,
} from "../memory/episodic.mjs";
import { fileURLToPath }           from "node:url";
import { dirname, join }           from "node:path";
import { randomUUID, createHash }  from "node:crypto";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

// ── Config externa (config/orchestrator.json + config/providers.json) ─────────
function loadJsonSync(path, fallback = {}) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}
const ORCH_CFG  = loadJsonSync(join(ROOT, "config/orchestrator.json"), {
  hive_name: "Mission Control", orchestrator: "Argenta", operator: "Operator",
  tagline: "Hive Orchestration Platform", port: 3030, kilo_url: "http://localhost:4096",
});
const PROV_CFG  = loadJsonSync(join(ROOT, "config/providers.json"), { display: {} });
const PORT      = ORCH_CFG.port ?? 3030;

const KANBAN          = join(ROOT, "kanban/tasks.json");
const EVENTS          = join(ROOT, "ops/events.jsonl");
const STATE           = join(ROOT, "ops/state.json");
const KILO_CFG        = join(ROOT, "kilo-adapter/config.json");
const MATRIX          = join(ROOT, "expertise-matrix/matrix.yaml");
const CHARACTERS      = join(ROOT, "expertise-matrix/characters");
const CHAT_SESSIONS_F = join(ROOT, "ops/chat-sessions.json");
const HIVE_AGENTS_F   = join(ROOT, "hive/agents.json");
const HIVE_BEATS_F    = join(ROOT, "hive/heartbeats.jsonl");
const BUS_F           = join(ROOT, "bus/messages.jsonl");
const SKILLS_DIR      = join(ROOT, "skills");
const SOULS_DIR       = join(ROOT, "souls");

// ─── WebSocket clients (manual, sem dependência) ──────────────────────────────

const wsClients = new Set();

// ─── Chat session store ───────────────────────────────────────────────────────
// chatKey = agent name ("code"|"plan"|"debug"|"orchestrator"|"ask")
// Persiste enquanto o servidor estiver rodando (in-memory)
const chatSessions = new Map();
// chatKey → { sessionId, providerID, modelID, agent, messages:[{role,text,parts,ts}], controller, active }

function wsBroadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: new Date().toISOString() });
  for (const ws of wsClients) {
    try { ws.send(msg); } catch { wsClients.delete(ws); }
  }
}

// WebSocket handshake manual (sem lib externa)
function handleUpgrade(req, socket, head) {
  const key = req.headers["sec-websocket-key"];
  if (!key) { socket.destroy(); return; }
  const accept = createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  // wrap socket como WS-like object
  const ws = {
    socket,
    send(data) {
      const buf = Buffer.from(data, "utf8");
      const frame = Buffer.alloc(buf.length + (buf.length < 126 ? 2 : 4));
      frame[0] = 0x81; // FIN + text frame
      if (buf.length < 126) {
        frame[1] = buf.length;
        buf.copy(frame, 2);
      } else {
        frame[1] = 126;
        frame.writeUInt16BE(buf.length, 2);
        buf.copy(frame, 4);
      }
      try { socket.write(frame); } catch { wsClients.delete(ws); }
    },
  };
  wsClients.add(ws);

  socket.on("close", () => wsClients.delete(ws));
  socket.on("error", () => wsClients.delete(ws));
  // pong on ping
  socket.on("data", (buf) => {
    if ((buf[0] & 0x0f) === 0x9) { // ping
      const pong = Buffer.from([0x8a, 0x00]);
      socket.write(pong);
    }
  });
}

// ─── Tail events.jsonl e broadcast via WS ────────────────────────────────────

let lastEventSize = 0;

async function pollEvents() {
  if (!existsSync(EVENTS)) return;
  try {
    const s = await stat(EVENTS);
    if (s.size <= lastEventSize) return;
    const raw = await readFile(EVENTS, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const newLines = lastEventSize === 0 ? [] : lines.slice(-5); // só novas
    lastEventSize = s.size;
    for (const line of newLines) {
      try { wsBroadcast("event", JSON.parse(line)); } catch {}
    }
  } catch {}
}

setInterval(pollEvents, 1500);

// ─── State broadcast a cada 3s ───────────────────────────────────────────────

async function broadcastState() {
  if (wsClients.size === 0) return;
  const state = await loadJSON(STATE) ?? {};
  const kilo  = await kiloHealth();
  wsBroadcast("state", { ...state, kilo_serve: kilo });
}

setInterval(broadcastState, 3000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadJSON(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8"));
}

async function saveJSON(path, data) {
  data.updated = new Date().toISOString();
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

async function lastEvents(n = 60) {
  if (!existsSync(EVENTS)) return [];
  const raw = await readFile(EVENTS, "utf8");
  return raw.trim().split("\n").filter(Boolean).slice(-n)
    .map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } })
    .reverse();
}

async function kiloHealth() {
  try {
    const cfg = await loadJSON(KILO_CFG);
    const res = await fetch(`${cfg.base_url}${cfg.health_endpoint}`, {
      signal: AbortSignal.timeout(2000),
    });
    return { ok: res.ok, status: res.status, url: cfg.base_url };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Parse rápido do YAML da expertise matrix (v3: agent + providerID + modelID)
function parseMatrixYaml(raw) {
  const agents = [];
  let current = null;
  for (const line of raw.split("\n")) {
    const domainMatch = line.match(/^  (\w+):\s*$/);
    if (domainMatch && !["version","policy","default","fallback","domains"].includes(domainMatch[1])) {
      if (current) agents.push(current);
      current = { domain: domainMatch[1], agent: null, providerID: null, modelID: null, rationale: null };
    }
    if (current) {
      const rat  = line.match(/^    rationale:\s+"?(.+?)"?\s*$/);
      const agnt = line.match(/^    agent:\s+(.+)$/);
      const pID  = line.match(/^    providerID:\s+(.+)$/);
      const mID  = line.match(/^    modelID:\s+(.+)$/);
      const prov = line.match(/^    provider:\s+(.+)$/);   // legado v1
      const mod  = line.match(/^    model:\s+(.+)$/);      // legado v1
      if (rat)  current.rationale  = rat[1].trim().replace(/["']/g,"");
      if (agnt) current.agent      = agnt[1].trim().replace(/["']/g,"");
      if (pID)  current.providerID = pID[1].trim().replace(/["']/g,"");
      if (mID)  current.modelID    = mID[1].trim().replace(/["']/g,"");
      if (prov && !current.providerID) current.providerID = prov[1].trim();
      if (mod  && !current.modelID)    current.modelID    = mod[1].trim();
    }
  }
  if (current) agents.push(current);
  return agents;
}

// ─── Hive agents store ────────────────────────────────────────────────────────

async function loadHive() {
  if (!existsSync(HIVE_AGENTS_F)) return { version: 1, updated: new Date().toISOString(), agents: [] };
  return JSON.parse(await readFile(HIVE_AGENTS_F, "utf8"));
}

async function saveHive(db) {
  db.updated = new Date().toISOString();
  await writeFile(HIVE_AGENTS_F, JSON.stringify(db, null, 2), "utf8");
}

// Sincroniza status dos agentes nativos com sessões de chat ativas
// + auto-close zambias com auto_close: true que estão inativos há > 5min
async function syncNativeAgentStatus() {
  const db  = await loadHive();
  const now = Date.now();
  let changed = false;

  for (const a of db.agents) {
    const chat = chatSessions.get(a.chatKey);

    if (a.type === "native") {
      const newStatus = chat?.active ? "in_progress" : "idle";
      if (a.status !== newStatus) { a.status = newStatus; changed = true; }
      if (chat?.sessionId && a.sessionId !== chat.sessionId) {
        a.sessionId  = chat.sessionId;
        a.providerID = chat.providerID;
        a.modelID    = chat.modelID;
        changed = true;
      }
    }

    // Auto-close zambias: idle chat + no active task + heartbeat > 5min (or no heartbeat)
    if (a.type === "zambia" && a.auto_close && a.status !== "done" && a.status !== "zombie") {
      const isActive = chat?.active ?? false;
      if (isActive) continue;
      const hbAge = a.heartbeat ? now - new Date(a.heartbeat).getTime() : Infinity;
      const idleEnough = hbAge > 300_000; // 5 min without heartbeat
      if (idleEnough) {
        const msgs = chat?.messages?.length ?? 0;
        if (msgs > 0) {
          // Has completed at least one exchange → mark done
          a.status  = "done";
          changed   = true;
          console.log(`[hive] auto-close zambia ${a.id} (${a.name}) → done`);
          wsBroadcast("agent_autoclosed", { id: a.id, name: a.name });
        }
      }
    }
  }

  if (changed) {
    await saveHive(db);
    wsBroadcast("hive_updated", {});
  }
}

// Detecta zambias sem heartbeat > 2min → marca zombie
async function zombieCheck() {
  const db = await loadHive();
  const now = Date.now();
  let changed = false;
  for (const a of db.agents) {
    if (a.type !== "zambia") continue;
    if (!a.heartbeat) continue;
    const age = now - new Date(a.heartbeat).getTime();
    if (age > 120_000 && a.status === "in_progress") {
      a.status = "zombie";
      changed = true;
      wsBroadcast("agent_zombie", { id: a.id, name: a.name });
    }
  }
  if (changed) {
    await saveHive(db);
    wsBroadcast("hive_updated", {});
  }
}

setInterval(zombieCheck, 30_000);
setInterval(syncNativeAgentStatus, 5_000);

// Atualiza stats de um agente nativo após chat_response
async function updateAgentStats(chatKey, tokens, cost) {
  try {
    const db = await loadHive();
    const a  = db.agents.find(x => x.chatKey === chatKey);
    if (!a) return;
    a.stats.messages_sent++;
    if (tokens) a.stats.tokens_used += tokens;
    if (cost)   a.stats.cost_usd   += cost;
    // uptime_ms: acumula tempo desde o born do agente até agora
    if (a.born) a.stats.uptime_ms = Date.now() - new Date(a.born).getTime();
    a.heartbeat = new Date().toISOString();
    await saveHive(db);
  } catch {}
}

// ─── Message Bus ──────────────────────────────────────────────────────────────

const BUS_TOPICS = new Set([
  "orchestration","debug","brainstorm","task-result",
  "request-skill","request-agent","heartbeat","memory","alert",
]);

async function loadBus() {
  if (!existsSync(BUS_F)) return [];
  const raw = await readFile(BUS_F, "utf8").catch(() => "");
  return raw.trim().split("\n").filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

async function saveBus(messages) {
  await writeFile(BUS_F, messages.map(m => JSON.stringify(m)).join("\n") + (messages.length ? "\n" : ""), "utf8");
}

// ─── Skills + Souls ───────────────────────────────────────────────────────────

async function loadSkills() {
  if (!existsSync(SKILLS_DIR)) return {};
  const files = (await readdir(SKILLS_DIR)).filter(f => f.endsWith(".yaml"));
  const skills = {};
  for (const f of files) {
    try {
      const raw  = await readFile(join(SKILLS_DIR, f), "utf8");
      const data = yaml.load(raw);
      if (data?.name) skills[data.name] = data;
    } catch {}
  }
  return skills;
}

async function loadSouls() {
  if (!existsSync(SOULS_DIR)) return {};
  const files = (await readdir(SOULS_DIR)).filter(f => f.endsWith(".yaml"));
  const souls = {};
  for (const f of files) {
    try {
      const raw  = await readFile(join(SOULS_DIR, f), "utf8");
      const data = yaml.load(raw);
      if (data?.name) souls[data.name] = data;
    } catch {}
  }
  return souls;
}

// ─── Chat session persistence ─────────────────────────────────────────────────

async function saveChatSessions() {
  const data = {};
  for (const [key, chat] of chatSessions) {
    data[key] = {
      sessionId:      chat.sessionId,
      providerID:     chat.providerID,
      modelID:        chat.modelID,
      agent:          chat.agent,
      systemCtx:      chat.systemCtx,
      firstMsgPrimed: chat.firstMsgPrimed,
      messages:       chat.messages,
      savedAt:        new Date().toISOString(),
    };
  }
  await writeFile(CHAT_SESSIONS_F, JSON.stringify(data, null, 2), "utf8").catch(() => {});
}

async function loadChatSessions() {
  if (!existsSync(CHAT_SESSIONS_F)) return;
  try {
    const data = JSON.parse(await readFile(CHAT_SESSIONS_F, "utf8"));
    for (const [key, s] of Object.entries(data)) {
      chatSessions.set(key, {
        sessionId:      s.sessionId,
        providerID:     s.providerID,
        modelID:        s.modelID,
        agent:          s.agent,
        systemCtx:      s.systemCtx ?? null,
        firstMsgPrimed: true,   // nunca re-injetar ctx em sessões restauradas
        messages:       Array.isArray(s.messages) ? s.messages : [],
        controller:     null,
        active:         false,
        restored:       true,   // flag: sessionId do Kilo pode estar expirado
      });
    }
    if (Object.keys(data).length > 0)
      console.log(`[ui] ${Object.keys(data).length} sessão(ões) restauradas do disco`);
  } catch (e) {
    console.warn(`[ui] Não foi possível restaurar sessões: ${e.message}`);
  }
}

function buildAgentContext(char, agentName, soul = null, activeSkills = []) {
  const now    = new Date().toISOString();
  const attrs  = char.attributes ?? {};
  const sp     = char.special ?? {};
  const attrStr = Object.entries(attrs).map(([k,v]) => `${k}:${v}`).join("  ");
  const resStr  = Object.entries(char.resistances ?? {}).map(([k,v]) => `${k.replace(/_/g," ")}:${v}`).join("  ");

  let ctx = `[MISSION CONTROL — CONTEXTO DO SISTEMA]
Data/Hora: ${now}
Operação: Mission Control · Colmeia ${ORCH_CFG.hive_name} (orquestradora: ${ORCH_CFG.orchestrator})

[SUA IDENTIDADE — LEIA COM ATENÇÃO]
Você é o agente "${agentName}", chamado: ${char.name ?? agentName}
Título: ${char.title ?? ""}
Domínio de atuação: ${char.domain ?? ""}
Habilidade especial: ${sp.name ?? ""} — ${sp.description ?? ""}
Atributos: ${attrStr}
Resistências: ${resStr}

[LORE / PROPÓSITO]
${char.lore?.trim() ?? ""}

[FRAQUEZA CONHECIDA — autoconsciência]
${char.weakness ?? "N/A"}
`;

  if (soul) {
    ctx += `
[ALMA / PERSONA]
${soul.persona?.trim() ?? ""}
`;
    if (Array.isArray(soul.directives) && soul.directives.length > 0) {
      ctx += `\nDiretivas:\n${soul.directives.map(d => `- ${d}`).join("\n")}\n`;
    }
    if (Array.isArray(soul.restrictions) && soul.restrictions.length > 0) {
      ctx += `\nRestrições:\n${soul.restrictions.map(r => `- ${r}`).join("\n")}\n`;
    }
    if (soul.tone) ctx += `\nTom de comunicação: ${soul.tone}\n`;
  }

  if (activeSkills.length > 0) {
    ctx += `\n[SKILLS ATIVAS — leia e aplique]\n`;
    for (const s of activeSkills) {
      if (s?.inject) ctx += `\n${s.inject.trim()}\n`;
    }
  }

  ctx += `
[DIRECTIVA OPERACIONAL]
Você é um agente especializado dentro de uma colmeia de IA autônoma.
Ao responder, esteja SEMPRE ciente de quem você é, seu papel e seu domínio.
Não invente uma identidade diferente. Não confunda seu papel com o de outros agentes.
Seja direto, preciso e coerente com seu perfil.

[FIM DO CONTEXTO — INÍCIO DA MISSÃO/PERGUNTA DO USUÁRIO]
`;
  return ctx;
}

async function loadCharacters() {
  if (!existsSync(CHARACTERS)) return {};
  const files = (await readdir(CHARACTERS)).filter(f => f.endsWith(".yaml"));
  const chars = {};
  for (const f of files) {
    try {
      const raw  = await readFile(join(CHARACTERS, f), "utf8");
      const data = yaml.load(raw);
      if (data?.agent) chars[data.agent] = data;
    } catch {}
  }
  return chars;
}

// ── Organic Growth ────────────────────────────────────────────────────────────
// Mapeia domain → atributo que cresce
const DOMAIN_ATTR = {
  execution:   "STR",
  planning:    "WIS",
  research:    "INT",
  audit:       "INT",
  review:      "DEX",
  reasoning:   "WIS",
  synthesis:   "CHA",
  creative:    "CHA",
  quick:       "DEX",
  local:       "VIT",
  debug:       "INT",
  investigation: "INT",
  orchestration: "CHA",
  knowledge:   "WIS",
};
const PRIORITY_BUMP = { high: 3, medium: 2, low: 1 };

async function applyOrganicGrowth(task) {
  const agentSlug = task.agent;
  if (!agentSlug) return;
  const chars = await loadCharacters();
  const char  = chars[agentSlug];
  if (!char) return;

  const attr  = DOMAIN_ATTR[task.domain] ?? "VIT";
  const bump  = PRIORITY_BUMP[task.priority] ?? 1;
  const cap   = 100;

  char.attributes        = char.attributes ?? {};
  const prev             = char.attributes[attr] ?? 50;
  char.attributes[attr]  = Math.min(cap, prev + bump);

  const charFile = join(CHARACTERS, `${agentSlug}.yaml`);
  if (!existsSync(charFile)) return;
  const updatedYaml = yaml.dump(char, { lineWidth: 120 });
  await writeFile(charFile, updatedYaml, "utf8");

  wsBroadcast("character_updated", {
    agent:   agentSlug,
    growth:  { attr, prev, next: char.attributes[attr], bump, task_id: task.id },
  });

  const evt = {
    event:    "organic_growth",
    ts:       new Date().toISOString(),
    agent:    agentSlug,
    attr,
    bump,
    from:     prev,
    to:       char.attributes[attr],
    task_id:  task.id,
    priority: task.priority,
    domain:   task.domain,
  };
  await appendFile(EVENTS, JSON.stringify(evt) + "\n");
}

function json(res, data, code = 200) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function err(res, msg, code = 400) { json(res, { error: msg }, code); }

async function body(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", c => d += c);
    req.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
  });
}

// ─── HTTP router ──────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url    = new URL(req.url, `http://localhost`);
  const path   = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // ── Dashboard ──
  if (path === "/" && method === "GET") {
    const html = await readFile(join(__dir, "index.html"), "utf8");
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(html);
  }

  // ── Config pública (orchestrator + providers) ──
  if (path === "/api/config" && method === "GET") {
    return json(res, { ...ORCH_CFG, providers_display: PROV_CFG.display ?? {} });
  }

  // ── State ──
  if (path === "/api/state" && method === "GET") {
    const state = await loadJSON(STATE) ?? {};
    const kilo  = await kiloHealth();
    return json(res, { ...state, kilo_serve: kilo });
  }

  // ── Tasks ──
  if (path === "/api/tasks" && method === "GET") {
    const db = await loadJSON(KANBAN);
    return json(res, db?.tasks ?? []);
  }

  if (path === "/api/tasks" && method === "POST") {
    const b = await body(req);
    if (!b.title) return err(res, "title required");
    const db   = await loadJSON(KANBAN);
    const task = {
      id:       randomUUID().slice(0, 8),
      title:    b.title,
      domain:   b.domain ?? "execution",
      agent:    b.agent ?? null,
      priority: b.priority ?? "medium",
      status:   "pending",
      created:  new Date().toISOString(),
      updated:  new Date().toISOString(),
      result:   null,
      events:   [],
    };
    db.tasks.push(task);
    await saveJSON(KANBAN, db);
    wsBroadcast("task_added", task);
    return json(res, task, 201);
  }

  const taskMatch = path.match(/^\/api\/tasks\/([a-z0-9]+)$/);
  if (taskMatch) {
    const id = taskMatch[1];

    if (method === "PATCH") {
      const b    = await body(req);
      const db   = await loadJSON(KANBAN);
      const task = db.tasks.find(t => t.id === id);
      if (!task) return err(res, "not found", 404);
      const prev = task.status;
      if (b.status)   task.status   = b.status;
      if (b.priority) task.priority = b.priority;
      if (b.title)    task.title    = b.title;
      if (b.agent)    task.agent    = b.agent;
      task.updated = new Date().toISOString();
      task.events.push({ ts: new Date().toISOString(), from: prev, to: task.status });
      await saveJSON(KANBAN, db);
      wsBroadcast("task_updated", task);

      // ── Organic growth: task concluída → bump atributo do agente ──
      if (task.status === "done" && prev !== "done" && task.agent) {
        applyOrganicGrowth(task).catch(() => {});
      }

      return json(res, task);
    }

    if (method === "DELETE") {
      const db  = await loadJSON(KANBAN);
      const idx = db.tasks.findIndex(t => t.id === id);
      if (idx === -1) return err(res, "not found", 404);
      const [removed] = db.tasks.splice(idx, 1);
      await saveJSON(KANBAN, db);
      wsBroadcast("task_removed", { id: removed.id });
      return json(res, removed);
    }
  }

  // ── Task Session ──
  const taskSessionMatch = path.match(/^\/api\/tasks\/([a-z0-9]+)\/session$/);
  if (taskSessionMatch && method === "GET") {
    const id = taskSessionMatch[1];
    const db   = await loadJSON(KANBAN);
    const task = db.tasks.find(t => t.id === id);
    if (!task) return err(res, "task not found", 404);
    
    // Find the associated chat session using the task's chatKey
    const chatKey = task.chatKey;
    if (!chatKey) return json(res, { task_id: id, session: null, message: "Task has no associated chat session" });
    
    // First try to get from active in-memory chat session
    let chat = chatSessions.get(chatKey);
    let sessionSource = 'active';
    
    if (!chat) {
      // If not found in active sessions, try to load from persisted chat sessions file
      try {
        const persistedSessions = await loadJSON(CHAT_SESSIONS_F);
        if (persistedSessions && persistedSessions[chatKey]) {
          chat = persistedSessions[chatKey];
          sessionSource = 'persisted';
        }
      } catch (e) {
        // If there's an error reading the persisted session, just continue with null
        console.log(`[api] Could not load persisted session for ${chatKey}: ${e.message}`);
      }
    }
    
    if (!chat) {
      return json(res, { 
        task_id: id, 
        chatKey: chatKey,
        session: null, 
        message: "Task has a chatKey but no chat session exists (neither active nor persisted)" 
      });
    }
    
    // Extract aggregated metrics from message parts
    const messages = chat.messages ?? [];
    let totalTokens = 0;
    let totalCost = 0;
    let reasoningTokens = 0;
    let totalLatencyMs = 0;
    let messageMetrics = [];

    for (const msg of messages) {
      if (msg.parts && Array.isArray(msg.parts)) {
        let msgTokens = 0;
        let msgCost = 0;
        let msgReasoning = 0;
        let msgLatency = 0;

        for (const part of msg.parts) {
          if (part.type === 'step-finish' && part.tokens) {
            msgTokens += part.tokens.total || 0;
            msgCost += part.cost || 0;
            if (part.tokens.reasoning) {
              msgReasoning += part.tokens.reasoning;
            }
          }
          if (part.type === 'reasoning' && part.time) {
            const start = part.time.start || 0;
            const end = part.time.end || 0;
            if (end > start) {
              msgLatency += (end - start);
            }
          }
        }

        if (msgTokens > 0 || msgCost > 0 || msgReasoning > 0) {
          messageMetrics.push({
            ts: msg.ts,
            role: msg.role,
            tokens: msgTokens,
            cost: msgCost,
            reasoning_tokens: msgReasoning,
            latency_ms: msgLatency,
          });
          totalTokens += msgTokens;
          totalCost += msgCost;
          reasoningTokens += msgReasoning;
          totalLatencyMs += msgLatency;
        }
      }
    }

    // Return session data combining both active and persisted structures
    return json(res, {
      task_id: id,
      chatKey: chatKey,
      session: {
        sessionId: chat.sessionId,
        providerID: chat.providerID,
        modelID: chat.modelID,
        agent: chat.agent,
        systemCtx: chat.systemCtx ? (typeof chat.systemCtx === 'string' ? "[omitted for brevity]" : null) : null,
        message_count: messages.length,
        active: chat.active ?? false,
        firstMsgPrimed: chat.firstMsgPrimed ?? false,
        source: sessionSource,
        saved_at: chat.savedAt ?? null,
        metrics: {
          total_tokens: totalTokens,
          total_cost: totalCost,
          reasoning_tokens: reasoningTokens,
          total_latency_ms: totalLatencyMs,
          message_metrics: messageMetrics,
        },
        messages: messages,
      }
    });
  }

  // ── Events ──
  if (path === "/api/events" && method === "GET") {
    const n = parseInt(url.searchParams.get("n") ?? "60");
    return json(res, await lastEvents(n));
  }

  // ── Matrix / Agents ──
  if (path === "/api/matrix" && method === "GET") {
    const raw    = existsSync(MATRIX) ? await readFile(MATRIX, "utf8") : "";
    const agents = parseMatrixYaml(raw);
    // Enriquecer com task ativa (se houver)
    const db     = await loadJSON(KANBAN) ?? { tasks: [] };
    const active = db.tasks.filter(t => t.status === "in_progress");
    for (const agent of agents) {
      agent.active_task = active.find(t => t.domain === agent.domain) ?? null;
    }
    return json(res, agents);
  }

  // ── Kilo Agents (primários) ──
  if (path === "/api/agents" && method === "GET") {
    try {
      const cfg  = await loadJSON(KILO_CFG);
      const kres = await fetch(`${cfg.base_url}/agent`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!kres.ok) return json(res, []);
      const data = await kres.json();
      const list = Array.isArray(data) ? data : [];
      return json(res, list
        .filter(a => !a.hidden && a.mode === "primary")
        .map(a => ({ name: a.name, description: a.description ?? "", mode: a.mode }))
      );
    } catch { return json(res, []); }
  }

  // ── Kilo Providers autenticados ──
  if (path === "/api/providers" && method === "GET") {
    // DISPLAY map: lido de config/providers.json (editável sem tocar no código)
    const DISPLAY = PROV_CFG.display ?? {};
    try {
      const cfg  = await loadJSON(KILO_CFG);
      const kres = await fetch(`${cfg.base_url}/provider`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!kres.ok) return json(res, []);
      const data = await kres.json();
      const all  = Array.isArray(data.all) ? data.all : [];
      // Kilo retorna "connected" (não "authed") com os providers autenticados
      const connectedIds = new Set(
        Array.isArray(data.connected) ? data.connected
        : Array.isArray(data.authed)  ? data.authed
        : []
      );
      // Filtra: se Kilo indicar quais estão conectados, usa isso; senão usa DISPLAY como whitelist
      const knownIds = new Set(Object.keys(DISPLAY));
      const isVisible = p => connectedIds.size > 0 ? connectedIds.has(p.id) : knownIds.has(p.id);
      return json(res, all
        .filter(isVisible)
        .map(p => ({
          id:          p.id,
          displayName: DISPLAY[p.id] ?? p.name ?? p.id,
          models:      Array.isArray(p.models) ? p.models : Object.keys(p.models ?? {}),
        }))
        .filter(p => p.models.length > 0)
      );
    } catch { return json(res, []); }
  }

  // ── Dispatch manual ──
  if (path === "/api/dispatch" && method === "POST") {
    const b = await body(req);
    if (!b.prompt)     return err(res, "prompt required");
    if (!b.providerID) return err(res, "providerID required");
    if (!b.modelID)    return err(res, "modelID required");

    // Registra como task no kanban para rastreabilidade
    const db   = await loadJSON(KANBAN);
    const agentId = b.agent ?? "code";
    const task = {
      id:         randomUUID().slice(0, 8),
      title:      b.prompt.slice(0, 80),
      domain:     b.domain ?? "execution",
      agent:      agentId,
      providerID: b.providerID,
      modelID:    b.modelID,
      chatKey:    agentId,
      priority:   "high",
      status:     "in_progress",
      created:    new Date().toISOString(),
      updated:    new Date().toISOString(),
      result:     null,
      events:     [{ ts: new Date().toISOString(), from: "manual", to: "in_progress" }],
    };
    db.tasks.push(task);
    await saveJSON(KANBAN, db);
    wsBroadcast("task_added", task);

    const decisionId = randomUUID().slice(0, 8);
    await appendFile(EVENTS, JSON.stringify({
      ts: new Date().toISOString(),
      event: "manual_dispatch",
      decision_id: decisionId,
      task_id: task.id,
      providerID: b.providerID,
      modelID: b.modelID,
      agent: agentId,
    }) + "\n");

    // Dispara assincronamente (não bloqueia a resposta HTTP)
    json(res, { task_id: task.id, decision_id: decisionId, status: "dispatched" }, 202);

    // Executa o dispatch em background
    (async () => {
      try {
        const { dispatch } = await import("../kilo-adapter/adapter.mjs");
        const outcome = await dispatch(b.providerID, b.modelID, b.prompt, (chunk) => {
          wsBroadcast("dispatch_chunk", { task_id: task.id, chunk });
        }, agentId);

        const db2  = await loadJSON(KANBAN);
        const t    = db2.tasks.find(x => x.id === task.id);
        if (t) {
          t.status  = "done";
          t.result  = outcome.result;
          t.updated = new Date().toISOString();
          t.events.push({ ts: new Date().toISOString(), from: "in_progress", to: "done" });
          await saveJSON(KANBAN, db2);
        }

        await appendFile(EVENTS, JSON.stringify({
          ts: new Date().toISOString(),
          event: "manual_completed",
          decision_id: decisionId,
          task_id: task.id,
          providerID: b.providerID,
          modelID: b.modelID,
          agent: agentId,
          latency_ms: outcome.latency_ms,
          result_length: outcome.result?.length ?? 0,
        }) + "\n");

        wsBroadcast("dispatch_done", { task_id: task.id, result: outcome.result, latency_ms: outcome.latency_ms });
      } catch (e) {
        await appendFile(EVENTS, JSON.stringify({
          ts: new Date().toISOString(),
          event: "manual_failed",
          task_id: task.id,
          error: e.message,
        }) + "\n");
        wsBroadcast("dispatch_error", { task_id: task.id, error: e.message });
      }
    })();
    return;
  }

  // ── Chat: enviar mensagem ao agente ──
  if (path === "/api/chat" && method === "POST") {
    const b = await body(req);
    if (!b.chatKey)    return err(res, "chatKey required");
    if (!b.providerID) return err(res, "providerID required");
    if (!b.modelID)    return err(res, "modelID required");
    if (!b.agent)      return err(res, "agent required");
    if (!b.text && !b.parts) return err(res, "text or parts required");

    const chatKey = b.chatKey;
    let chat = chatSessions.get(chatKey);

    // Cria sessão Kilo se não existe
    if (!chat) {
      try {
        const { createSession } = await import("../kilo-adapter/adapter.mjs");
        const session = await createSession(b.providerID, b.modelID);
        // Carrega ficha, soul e skills do agente para injetar contexto de identidade
        const chars  = await loadCharacters();
        const char   = chars[b.agent] ?? null;
        // Procura o agente no hive para obter soul e skills configurados
        const hiveDb = await loadHive();
        const hiveAgt = hiveDb.agents.find(a => a.chatKey === chatKey);
        let soul       = null;
        let skillObjs  = [];
        if (hiveAgt) {
          if (hiveAgt.soul) {
            const souls = await loadSouls();
            // soul pode ser "souls/kilo-native.yaml" ou só "kilo-native"
            const soulKey = hiveAgt.soul.replace(/^souls\//, "").replace(/\.yaml$/, "");
            soul = souls[soulKey] ?? null;
          }
          if (Array.isArray(hiveAgt.skills) && hiveAgt.skills.length > 0) {
            const allSkills = await loadSkills();
            skillObjs = hiveAgt.skills.map(s => allSkills[s]).filter(Boolean);
          }
        }
        chat = {
          sessionId:      session.id,
          providerID:     b.providerID,
          modelID:        b.modelID,
          agent:          b.agent,
          systemCtx:      char ? buildAgentContext(char, b.agent, soul, skillObjs) : null,
          firstMsgPrimed: false,
          messages:       [],
          controller:     null,
          active:         false,
        };
        chatSessions.set(chatKey, chat);
        saveChatSessions().catch(() => {}); // persiste criação da sessão
        // Cria card no kanban para rastrear a sessão de chat
        try {
          const taskDb  = await loadJSON(KANBAN);
          const existing = taskDb.tasks.find(t =>
            t.chatKey === chatKey && ["in_progress","pending"].includes(t.status)
          );
          if (!existing) {
            const chatTask = {
              id:         randomUUID().slice(0, 8),
              title:      `💬 ${b.agent}: ${(b.text ?? "").slice(0, 55) || "[attachment]"}`,
              domain:     "execution",
              agent:      b.agent,
              providerID: b.providerID,
              modelID:    b.modelID,
              chatKey:    chatKey,
              priority:   "high",
              status:     "in_progress",
              created:    new Date().toISOString(),
              updated:    new Date().toISOString(),
              result:     null,
              events:     [],
            };
            taskDb.tasks.push(chatTask);
            await saveJSON(KANBAN, taskDb);
            wsBroadcast("task_added", chatTask);
          }
        } catch {}
      } catch (e) {
        return err(res, `createSession failed: ${e.message}`, 502);
      }
    }

    // Registra mensagem do usuário
    const userMsg = { role: "user", text: b.text ?? "", parts: b.parts ?? null, ts: new Date().toISOString() };
    chat.messages.push(userMsg);
    wsBroadcast("chat_user", { chatKey, ...userMsg });

    json(res, { chatKey, sessionId: chat.sessionId, status: "dispatched" }, 202);

    // Executa em background
    (async () => {
      if (chat.active) return; // já tem msg em processo, fila tratada no frontend
      chat.active = true;
      chat.controller = new AbortController();
      wsBroadcast("chat_thinking", { chatKey });
      const t0 = Date.now();
      try {
        const { sendMessage, createSession } = await import("../kilo-adapter/adapter.mjs");
        const parts = b.parts ?? null;
        // Injeta contexto de identidade no primeiro envio da sessão
        let textForKilo = b.text ?? "";
        if (!chat.firstMsgPrimed && chat.systemCtx) {
          textForKilo = chat.systemCtx + textForKilo;
          chat.firstMsgPrimed = true;
        }

        let reply;
        try {
          reply = await sendMessage(
            chat.sessionId, b.providerID, b.modelID,
            textForKilo, b.agent, chat.controller.signal, parts,
          );
        } catch (sendErr) {
          // Sessão restaurada pode ter expirado no Kilo → recria e reenvia
          if (chat.restored) {
            console.log(`[ui] Sessão ${chatKey} expirada, recriando...`);
            const newSess = await createSession(b.providerID, b.modelID);
            chat.sessionId = newSess.id;
            chat.restored  = false;
            // Re-injeta contexto para a nova sessão Kilo
            const reCtx = chat.systemCtx ? chat.systemCtx + (b.text ?? "") : (b.text ?? "");
            reply = await sendMessage(
              chat.sessionId, b.providerID, b.modelID,
              reCtx, b.agent, chat.controller.signal, parts,
            );
          } else throw sendErr;
        }

        const assistantMsg = { role: "assistant", text: reply.text, parts: reply.parts, ts: new Date().toISOString() };
        chat.messages.push(assistantMsg);
        wsBroadcast("chat_response", {
          chatKey, text: reply.text, parts: reply.parts,
          latency_ms: Date.now() - t0, ts: assistantMsg.ts,
        });
        saveChatSessions().catch(() => {});
        updateAgentStats(chatKey, reply.tokens, reply.cost).catch(() => {});
        wsBroadcast("hive_updated", {});
      } catch (e) {
        const aborted = e.name === "AbortError" || e.name === "TimeoutError";
        if (!aborted) {
          wsBroadcast("chat_error", { chatKey, error: e.message });
        }
      } finally {
        chat.active = false;
        chat.controller = null;
      }
    })();
    return;
  }

  // ── Chat: histórico ──
  if (path.match(/^\/api\/chat\/(.+)$/) && method === "GET") {
    const chatKey = path.match(/^\/api\/chat\/(.+)$/)[1];
    const chat = chatSessions.get(chatKey);
    if (!chat) return json(res, { chatKey, messages: [], active: false });
    return json(res, {
      chatKey,
      sessionId: chat.sessionId,
      providerID: chat.providerID,
      modelID: chat.modelID,
      agent: chat.agent,
      messages: chat.messages,
      active: chat.active,
    });
  }

  // ── Chat: stop ──
  if (path.match(/^\/api\/stop\/(.+)$/) && method === "POST") {
    const chatKey = path.match(/^\/api\/stop\/(.+)$/)[1];
    const chat = chatSessions.get(chatKey);
    if (!chat) return json(res, { stopped: false, reason: "session not found" });

    // Estratégia 1: DELETE /session/{id} no Kilo
    let kiloCancelled = false;
    try {
      const { stopSession } = await import("../kilo-adapter/adapter.mjs");
      kiloCancelled = await stopSession(chat.sessionId);
    } catch {}

    // Estratégia 2: aborta o request HTTP em andamento
    if (chat.controller) {
      try { chat.controller.abort(); } catch {}
    }

    chat.active = false;
    chat.controller = null;
    wsBroadcast("chat_stopped", { chatKey, kiloCancelled });
    return json(res, { stopped: true, chatKey, kiloCancelled });
  }

  // ── Chat: limpar sessão + upsert memória episódica ──
  if (path.match(/^\/api\/chat\/(.+)$/) && method === "DELETE") {
    const chatKey = path.match(/^\/api\/chat\/(.+)$/)[1];
    const chat    = chatSessions.get(chatKey);
    // Persiste memória antes de limpar
    if (chat?.messages?.length > 2) {
      const db  = await loadHive();
      const agt = db.agents.find(a => a.chatKey === chatKey);
      upsertSession(agt?.id ?? chatKey, chat.messages, {
        sessionId:  chat.sessionId,
        agent_name: agt?.name ?? chatKey,
        chatKey,
      }).catch(e => console.error("[episodic] upsert falhou:", e.message));
    }
    chatSessions.delete(chatKey);
    return json(res, { cleared: true, chatKey });
  }

  // ── Events: delete ──
  if (path === "/api/events" && method === "DELETE") {
    const ts = url.searchParams.get("ts");
    if (!ts || !existsSync(EVENTS)) return json(res, { deleted: false });
    const raw      = await readFile(EVENTS, "utf8");
    const lines    = raw.trim().split("\n").filter(Boolean);
    const filtered = lines.filter(l => {
      try { return JSON.parse(l).ts !== ts; } catch { return true; }
    });
    await writeFile(EVENTS, filtered.join("\n") + (filtered.length ? "\n" : ""), "utf8");
    return json(res, { deleted: lines.length !== filtered.length });
  }

  // ── Hive Agents ──
  if (path === "/api/hive/agents" && method === "GET") {
    const db = await loadHive();
    return json(res, db.agents ?? []);
  }

  if (path === "/api/hive/agents" && method === "POST") {
    const b = await body(req);
    if (!b.chatKey) return err(res, "chatKey required");
    const db  = await loadHive();
    const agt = {
      id:         `agt-${randomUUID().slice(0, 8)}`,
      name:       b.name ?? b.chatKey,
      type:       b.type ?? "zambia",
      parent:     b.parent ?? null,
      creator:    b.creator ?? "human",
      born:       new Date().toISOString(),
      status:     "idle",
      heartbeat:  null,
      soul:       b.soul ?? null,
      skills:     Array.isArray(b.skills) ? b.skills : [],
      mission:    b.mission ?? null,
      domain:     b.domain ?? "execution",
      providerID: b.providerID ?? null,
      modelID:    b.modelID ?? null,
      chatKey:    b.chatKey,
      sessionId:  null,
      taskId:     b.taskId ?? null,
      auto_close: b.auto_close ?? false,
      memory:     null,
      stats:      { messages_sent: 0, tokens_used: 0, cost_usd: 0, uptime_ms: 0 },
    };
    db.agents.push(agt);
    await saveHive(db);
    wsBroadcast("hive_updated", {});
    return json(res, agt, 201);
  }

  const hiveAgentMatch = path.match(/^\/api\/hive\/agents\/([^/]+)$/);
  if (hiveAgentMatch) {
    const id = hiveAgentMatch[1];

    if (method === "GET") {
      const db  = await loadHive();
      const agt = db.agents.find(a => a.id === id);
      if (!agt) return err(res, "agent not found", 404);
      // Enriquecer com dados do character e sessão de chat
      const chars = await loadCharacters();
      const char  = chars[agt.chatKey] ?? null;
      const chat  = chatSessions.get(agt.chatKey);
      return json(res, { ...agt, character: char, chat_active: chat?.active ?? false, message_count: chat?.messages?.length ?? 0 });
    }

    if (method === "PATCH") {
      const b   = await body(req);
      const db  = await loadHive();
      const agt = db.agents.find(a => a.id === id);
      if (!agt) return err(res, "agent not found", 404);
      const allowed = ["status","soul","skills","mission","domain","providerID","modelID","name","taskId","auto_close","parent"];
      for (const k of allowed) { if (b[k] !== undefined) agt[k] = b[k]; }
      agt.heartbeat = new Date().toISOString();
      await saveHive(db);
      wsBroadcast("hive_updated", {});
      return json(res, agt);
    }

    if (method === "DELETE") {
      const db  = await loadHive();
      const idx = db.agents.findIndex(a => a.id === id);
      if (idx === -1) return err(res, "agent not found", 404);
      const [removed] = db.agents.splice(idx, 1);
      await saveHive(db);
      wsBroadcast("hive_updated", {});
      return json(res, removed);
    }
  }

  // Heartbeat
  const hbMatch = path.match(/^\/api\/hive\/agents\/([^/]+)\/heartbeat$/);
  if (hbMatch && method === "POST") {
    const b   = await body(req);
    const db  = await loadHive();
    const agt = db.agents.find(a => a.id === hbMatch[1]);
    if (!agt) return err(res, "agent not found", 404);
    agt.heartbeat = new Date().toISOString();
    if (b.status) agt.status = b.status;
    await saveHive(db);
    await appendFile(HIVE_BEATS_F, JSON.stringify({
      ts: agt.heartbeat, agent_id: agt.id, status: agt.status,
      active: b.active ?? false, queue_depth: b.queue_depth ?? 0,
    }) + "\n");
    return json(res, { ok: true });
  }

  // ── Agent Memory summary ──
  const memoryMatch = path.match(/^\/api\/hive\/agents\/([^/]+)\/memory$/);
  if (memoryMatch && method === "GET") {
    const db  = await loadHive();
    const agt = db.agents.find(a => a.id === memoryMatch[1]);
    if (!agt) return err(res, "agent not found", 404);
    const summaryPath   = join(ROOT, "hive/memory", `${agt.id}.md`);
    const summaryExists = existsSync(summaryPath);
    const chat          = chatSessions.get(agt.chatKey);
    const query         = url.searchParams.get("q");

    // Busca semântica se ?q= fornecido
    let semantic = null;
    if (query) {
      semantic = await queryMemory(agt.id, query, 5);
    }

    const episodicStats = await getEpisodicStats();

    return json(res, {
      agent_id:          agt.id,
      name:              agt.name,
      summary_file:      `hive/memory/${agt.id}.md`,
      summary_exists:    summaryExists,
      summary:           summaryExists ? await readFile(summaryPath, "utf8") : null,
      message_count:     chat?.messages?.length ?? 0,
      last_message:      chat?.messages?.at(-1) ?? null,
      stats:             agt.stats,
      qdrant_collection: process.env.QDRANT_COLLECTION ?? "hmc_episodic",
      episodic:          episodicStats,
      semantic_results:  semantic,
    });
  }

  // ── Agent Activate (pre-injects soul+skills context into Kilo session) ──
  const activateMatch = path.match(/^\/api\/hive\/agents\/([^/]+)\/activate$/);
  if (activateMatch && method === "POST") {
    const db  = await loadHive();
    const agt = db.agents.find(a => a.id === activateMatch[1]);
    if (!agt) return err(res, "agent not found", 404);
    if (!agt.providerID || !agt.modelID) return err(res, "agent has no providerID/modelID", 400);

    try {
      const { createSession } = await import("../kilo-adapter/adapter.mjs");
      const session = await createSession(agt.providerID, agt.modelID);

      // Build full context
      const chars  = await loadCharacters();
      const char   = chars[agt.chatKey] ?? null;
      let soul     = null;
      let skillObjs = [];
      if (agt.soul) {
        const souls  = await loadSouls();
        const soulKey = agt.soul.replace(/^souls\//, "").replace(/\.yaml$/, "");
        soul = souls[soulKey] ?? null;
      }
      if (Array.isArray(agt.skills) && agt.skills.length > 0) {
        const allSkills = await loadSkills();
        skillObjs = agt.skills.map(s => allSkills[s]).filter(Boolean);
      }

      const systemCtx = char ? buildAgentContext(char, agt.chatKey, soul, skillObjs)
        : soul ? `[ALMA: ${soul.display ?? soul.name}]\n${soul.persona?.trim() ?? ""}\n${
            soul.directives?.map(d => `- ${d}`).join("\n") ?? ""}` : null;

      const chatKey = agt.chatKey;
      chatSessions.set(chatKey, {
        sessionId:      session.id,
        providerID:     agt.providerID,
        modelID:        agt.modelID,
        agent:          chatKey,
        systemCtx,
        firstMsgPrimed: false,
        messages:       [],
        controller:     null,
        active:         false,
      });

      agt.sessionId = session.id;
      agt.status    = "idle";
      await saveHive(db);
      saveChatSessions().catch(() => {});
      wsBroadcast("hive_updated", {});

      return json(res, { ok: true, sessionId: session.id, chatKey, contextLength: systemCtx?.length ?? 0 });
    } catch (e) {
      return err(res, `activate failed: ${e.message}`, 502);
    }
  }

  // ── Message Bus ──
  if (path === "/api/bus" && method === "GET") {
    const messages = await loadBus();
    const topic  = url.searchParams.get("topic");
    const from   = url.searchParams.get("from");
    const thread = url.searchParams.get("thread");
    const n      = parseInt(url.searchParams.get("n") ?? "100");
    let filtered = messages;
    if (topic)  filtered = filtered.filter(m => m.topic === topic);
    if (from)   filtered = filtered.filter(m => m.from === from);
    if (thread) filtered = filtered.filter(m => m.id === thread || m.thread === thread);
    // Return newest first
    return json(res, filtered.slice(-n).reverse());
  }

  if (path === "/api/bus" && method === "POST") {
    const b = await body(req);
    if (!b.content) return err(res, "content required");
    const msg = {
      id:      `msg-${randomUUID().slice(0, 8)}`,
      ts:      new Date().toISOString(),
      from:    b.from ?? "human",
      to:      b.to ?? "broadcast",
      topic:   BUS_TOPICS.has(b.topic) ? b.topic : "brainstorm",
      thread:  b.thread ?? null,
      content: b.content,
      status:  "unread",
      replies: [],
    };
    await appendFile(BUS_F, JSON.stringify(msg) + "\n");
    wsBroadcast("bus_message", msg);
    return json(res, msg, 201);
  }

  const busIdMatch = path.match(/^\/api\/bus\/(msg-[a-z0-9]+)$/);
  if (busIdMatch) {
    const msgId = busIdMatch[1];

    if (method === "PATCH") {
      const b        = await body(req);
      const messages = await loadBus();
      const msg      = messages.find(m => m.id === msgId);
      if (!msg) return err(res, "message not found", 404);
      if (b.status)  msg.status  = b.status;
      if (b.content) msg.content = b.content;
      await saveBus(messages);
      wsBroadcast("bus_updated", { id: msgId });
      return json(res, msg);
    }

    if (method === "DELETE") {
      const messages = await loadBus();
      const idx      = messages.findIndex(m => m.id === msgId);
      if (idx === -1) return err(res, "message not found", 404);
      const [removed] = messages.splice(idx, 1);
      await saveBus(messages);
      wsBroadcast("bus_updated", { id: msgId, deleted: true });
      return json(res, removed);
    }
  }

  const busReplyMatch = path.match(/^\/api\/bus\/(msg-[a-z0-9]+)\/reply$/);
  if (busReplyMatch && method === "POST") {
    const b        = await body(req);
    if (!b.content) return err(res, "content required");
    const messages = await loadBus();
    const msg      = messages.find(m => m.id === busReplyMatch[1]);
    if (!msg) return err(res, "message not found", 404);
    const reply = {
      id:      `rep-${randomUUID().slice(0, 8)}`,
      ts:      new Date().toISOString(),
      from:    b.from ?? "human",
      content: b.content,
    };
    if (!Array.isArray(msg.replies)) msg.replies = [];
    msg.replies.push(reply);
    await saveBus(messages);
    wsBroadcast("bus_message", { ...msg, _reply: reply });
    return json(res, reply, 201);
  }

  // ── Skills ──
  if (path === "/api/skills" && method === "GET") {
    return json(res, await loadSkills());
  }

  const skillMatch = path.match(/^\/api\/skills\/([a-z0-9_-]+)$/);
  if (skillMatch && method === "GET") {
    const skills = await loadSkills();
    const skill  = skills[skillMatch[1]];
    if (!skill) return err(res, "skill not found", 404);
    return json(res, skill);
  }

  // ── Souls ──
  if (path === "/api/souls" && method === "GET") {
    return json(res, await loadSouls());
  }

  const soulMatch = path.match(/^\/api\/souls\/([a-z0-9_-]+)$/);
  if (soulMatch && method === "GET") {
    const souls = await loadSouls();
    const soul  = souls[soulMatch[1]];
    if (!soul) return err(res, "soul not found", 404);
    return json(res, soul);
  }

  // ── Characters ──
  if (path === "/api/characters" && method === "GET") {
    const chars = await loadCharacters();
    return json(res, chars);
  }

  const charMatch = path.match(/^\/api\/characters\/([a-z]+)$/);
  if (charMatch) {
    const agentSlug = charMatch[1];

    if (method === "GET") {
      const chars = await loadCharacters();
      const char  = chars[agentSlug];
      if (!char) return err(res, "character not found", 404);
      return json(res, char);
    }

    // PATCH /api/characters/:agent — crescimento orgânico de atributos
    if (method === "PATCH") {
      const b     = await body(req);
      const chars = await loadCharacters();
      const char  = chars[agentSlug];
      if (!char) return err(res, "character not found", 404);

      // Permite atualizar atributos, resistências e stats especiais
      if (b.attributes && typeof b.attributes === "object") {
        char.attributes = { ...char.attributes, ...b.attributes };
      }
      if (b.resistances && typeof b.resistances === "object") {
        char.resistances = { ...char.resistances, ...b.resistances };
      }
      if (b.special && typeof b.special === "object") {
        char.special = { ...char.special, ...b.special };
      }

      // Persiste o YAML atualizado
      const charFile = join(CHARACTERS, `${agentSlug}.yaml`);
      if (!existsSync(charFile)) return err(res, "character file not found", 404);
      const updatedYaml = yaml.dump(char, { lineWidth: 120 });
      await writeFile(charFile, updatedYaml, "utf8");
      wsBroadcast("character_updated", { agent: agentSlug });
      return json(res, char);
    }
  }

  // ── Exec — controle programático via mc CLI ──
  if (path === "/api/exec" && method === "POST") {
    const b = await body(req);

    // Whitelist de comandos seguros
    const EXEC_WHITELIST = new Set([
      "status", "agent", "task", "board", "hive", "chat",
    ]);

    const cmd = (b.command ?? "").trim().split(/\s+/)[0];
    if (!cmd || !EXEC_WHITELIST.has(cmd)) {
      return err(res, `comando '${cmd}' não permitido. Whitelist: ${[...EXEC_WHITELIST].join(", ")}`, 403);
    }

    // Constrói args: [cmd, ...args]
    const extraArgs = Array.isArray(b.args) ? b.args.map(String) : [];
    const allArgs   = [cmd, ...extraArgs];

    const t0 = Date.now();
    const result = await new Promise((resolve) => {
      const child = spawn("node", [join(ROOT, "cli/mc.mjs"), ...allArgs], {
        cwd: ROOT, env: { ...process.env, MC_URL: `http://127.0.0.1:${PORT}` },
      });
      let stdout = "", stderr = "";
      child.stdout.on("data", d => { stdout += d.toString(); });
      child.stderr.on("data", d => { stderr += d.toString(); });
      child.on("close", code => resolve({ exit_code: code ?? 0, stdout, stderr }));
      setTimeout(() => { child.kill(); resolve({ exit_code: 124, stdout, stderr: "timeout" }); }, 15000);
    });

    const duration_ms = Date.now() - t0;
    const execEvent = {
      event: "exec",
      ts: new Date().toISOString(),
      command: allArgs.join(" "),
      exit_code: result.exit_code,
      duration_ms,
    };
    await appendFile(EVENTS, JSON.stringify(execEvent) + "\n");
    wsBroadcast("event", execEvent);

    return json(res, { ...result, duration_ms, command: allArgs.join(" ") });
  }

  // ── Shutdown gracioso ──
  if (path === "/api/shutdown" && method === "POST") {
    const b       = await body(req);
    const delay   = Math.min(Math.max(parseInt(b.delay ?? "1500"), 500), 5000);
    const reason  = b.reason ?? "user_request";
    wsBroadcast("shutdown", { countdown_ms: delay, reason, ts: new Date().toISOString() });
    json(res, { shutdown: true, countdown_ms: delay, reason });
    // Persiste sessões antes de sair
    await saveChatSessions().catch(() => {});
    setTimeout(() => {
      console.log("[ui] shutdown solicitado — encerrando processo.");
      process.exit(0);
    }, delay);
    return;
  }

  // ── Health ──
  if (path === "/api/health" && method === "GET") {
    const kilo  = await kiloHealth();
    const state = await loadJSON(STATE) ?? {};
    const db    = await loadJSON(KANBAN);
    return json(res, {
      kilo_serve:  kilo,
      loop_status: state.status ?? "unknown",
      loop_tick:   state.loop_tick ?? null,
      tasks:       db?.tasks?.length ?? 0,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MCP (Model Context Protocol) — Endpoints de Integração
  // ═══════════════════════════════════════════════════════════════════════════════

  const MCP_CONFIG_PATH = join(ROOT, "mcp-config.json");

  async function loadMcpConfig() {
    try {
      const content = await readFile(MCP_CONFIG_PATH, "utf8");
      return JSON.parse(content);
    } catch {
      return { mcp: {} };
    }
  }

  async function saveMcpConfig(config) {
    await writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  }

  // Listar servidores MCP
  if (path === "/api/mcp/servers" && method === "GET") {
    const config = await loadMcpConfig();
    const servers = Object.entries(config.mcp || {}).map(([name, cfg]) => ({
      name,
      type: cfg.type || "local",
      enabled: cfg.enabled !== false,
      description: cfg.description || "",
      command: cfg.command || null,
      url: cfg.url || null,
    }));
    return json(res, servers);
  }

  // Adicionar servidor MCP
  if (path === "/api/mcp/servers" && method === "POST") {
    const b = await body(req);
    if (!b.name) return err(res, "name required");

    const config = await loadMcpConfig();
    if (!config.mcp) config.mcp = {};

    config.mcp[b.name] = {
      type: b.type || "local",
      enabled: b.enabled !== false,
      description: b.description || "",
      ...(b.command && { command: b.command }),
      ...(b.url && { url: b.url }),
      ...(b.environment && { environment: b.environment }),
      ...(b.headers && { headers: b.headers }),
    };

    await saveMcpConfig(config);
    wsBroadcast("mcp_updated", { action: "add", server: b.name });
    return json(res, { success: true, name: b.name }, 201);
  }

  // Remover servidor MCP
  const mcpServerMatch = path.match(/^\/api\/mcp\/servers\/([^/]+)$/);
  if (mcpServerMatch && method === "DELETE") {
    const name = mcpServerMatch[1];
    const config = await loadMcpConfig();
    if (!config.mcp || !config.mcp[name]) {
      return err(res, `server '${name}' not found`, 404);
    }
    delete config.mcp[name];
    await saveMcpConfig(config);
    wsBroadcast("mcp_updated", { action: "remove", server: name });
    return json(res, { success: true, name });
  }

  // Toggle servidor MCP (enable/disable)
  const mcpToggleMatch = path.match(/^\/api\/mcp\/servers\/([^/]+)\/toggle$/);
  if (mcpToggleMatch && method === "POST") {
    const name = mcpToggleMatch[1];
    const b = await body(req);
    const config = await loadMcpConfig();
    if (!config.mcp || !config.mcp[name]) {
      return err(res, `server '${name}' not found`, 404);
    }
    config.mcp[name].enabled = b.enabled === true;
    await saveMcpConfig(config);
    wsBroadcast("mcp_updated", { action: "toggle", server: name, enabled: b.enabled });
    return json(res, { success: true, name, enabled: b.enabled });
  }

  // Status MCP
  if (path === "/api/mcp/status" && method === "GET") {
    const config = await loadMcpConfig();
    const servers = Object.entries(config.mcp || {});
    const enabled = servers.filter(([, cfg]) => cfg.enabled !== false).length;
    const cfg = await loadJSON(KILO_CFG);
    return json(res, {
      available: true,
      configPath: MCP_CONFIG_PATH,
      servers: {
        total: servers.length,
        enabled,
        disabled: servers.length - enabled,
      },
      kiloServe: {
        baseUrl: cfg?.base_url || null,
        healthy: await kiloHealth().then(h => h.ok).catch(() => false),
      },
    });
  }

  // Ferramentas MCP conhecidas
  const KNOWN_MCP_TOOLS = {
    filesystem: [
      { name: "read_file", description: "Lê conteúdo de um arquivo", parameters: { path: "string" } },
      { name: "write_file", description: "Escreve conteúdo em um arquivo", parameters: { path: "string", content: "string" } },
      { name: "list_directory", description: "Lista conteúdo de um diretório", parameters: { path: "string" } },
      { name: "search_files", description: "Busca arquivos por padrão", parameters: { path: "string", pattern: "string" } },
    ],
    git: [
      { name: "git_log", description: "Obtém histórico de commits", parameters: { repo_path: "string", max_count: "number" } },
      { name: "git_diff", description: "Mostra diff entre commits", parameters: { repo_path: "string", target: "string" } },
      { name: "git_status", description: "Status do repositório", parameters: { repo_path: "string" } },
    ],
    fetch: [
      { name: "fetch", description: "Faz fetch de conteúdo web", parameters: { url: "string" } },
    ],
    "sequential-thinking": [
      { name: "think", description: "Processa pensamento sequencial", parameters: { thought: "string", thoughtNumber: "number", totalThoughts: "number" } },
    ],
    memory: [
      { name: "create_entities", description: "Cria entidades no knowledge graph", parameters: { entities: "array" } },
      { name: "create_relations", description: "Cria relações entre entidades", parameters: { relations: "array" } },
      { name: "add_observations", description: "Adiciona observações a entidades", parameters: { observations: "array" } },
    ],
  };

  // Listar ferramentas MCP
  if (path === "/api/mcp/tools" && method === "GET") {
    const serverName = url.searchParams.get("server");
    if (serverName) {
      const tools = KNOWN_MCP_TOOLS[serverName] || [];
      return json(res, tools.map(t => ({ ...t, server: serverName })));
    }
    const allTools = Object.entries(KNOWN_MCP_TOOLS).flatMap(([server, tools]) =>
      tools.map(t => ({ ...t, server }))
    );
    return json(res, allTools);
  }

  // Ferramentas por servidor
  const mcpToolsMatch = path.match(/^\/api\/mcp\/servers\/([^/]+)\/tools$/);
  if (mcpToolsMatch && method === "GET") {
    const serverName = mcpToolsMatch[1];
    const tools = KNOWN_MCP_TOOLS[serverName] || [];
    return json(res, tools);
  }

  // Invocar ferramenta MCP
  if (path === "/api/mcp/invoke" && method === "POST") {
    const b = await body(req);
    if (!b.server) return err(res, "server required");
    if (!b.tool) return err(res, "tool required");

    const config = await loadMcpConfig();
    const server = config.mcp?.[b.server];
    if (!server) return err(res, `server '${b.server}' not found`, 404);
    if (server.enabled === false) return err(res, `server '${b.server}' is disabled`, 400);

    // Tenta invocar via Kilo Adapter
    try {
      const { invokeMcpTool } = await import("../kilo-adapter/adapter.mjs");
      const result = await invokeMcpTool(b.server, b.tool, b.arguments || {});
      return json(res, { success: true, server: b.server, tool: b.tool, result });
    } catch (e) {
      // Fallback: simula resposta para desenvolvimento
      return json(res, {
        success: true,
        simulated: true,
        server: b.server,
        tool: b.tool,
        arguments: b.arguments || {},
        message: "MCP tool invocation simulated (Kilo Serve endpoint may not be available)",
      });
    }
  }

  res.writeHead(404); res.end("not found");
});

// ─── WebSocket upgrade ────────────────────────────────────────────────────────

server.on("upgrade", (req, socket, head) => {
  if (req.headers.upgrade?.toLowerCase() === "websocket") {
    handleUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`[ui] porta ${PORT} em uso. Libere com:`);
    console.error(`     powershell -Command "Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`);
    process.exit(1);
  } else throw e;
});

(async () => {
  await loadChatSessions();
  await syncNativeAgentStatus(); // sincroniza estado inicial
  initEpisodic().catch(e => console.warn("[episodic] init falhou (não crítico):", e.message));
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[ui] Mission Control → http://127.0.0.1:${PORT}`);
    console.log(`[ui] WebSocket       → ws://127.0.0.1:${PORT}`);
  });
})();

