/**
 * memory/episodic.mjs — Memória Episódica Híbrida
 *
 * Stack:
 *   Embeddings: Ollama (localhost:11434) + modelo embedding-gemma
 *   Vetores:    Qdrant (localhost:6333)
 *   Fallback:   cache local JSON em hive/memory/cache/ quando Qdrant offline
 *               sincroniza automaticamente ao reconectar
 *
 * API pública:
 *   upsertSession(agentId, messages, metadata?)  → salva sessão como memória
 *   queryMemory(agentId, queryText, topK?)       → busca semântica
 *   syncPendingCache()                           → drena cache → Qdrant
 *   getStats()                                   → estado do sistema de memória
 */

import { readFile, writeFile, appendFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname }  from "node:path";
import { fileURLToPath }  from "node:url";
import { randomUUID }     from "node:crypto";

const __dir        = dirname(fileURLToPath(import.meta.url));
const ROOT         = join(__dir, "..");
const CACHE_DIR    = join(ROOT, "hive/memory/cache");
const PENDING_FILE = join(ROOT, "hive/memory/cache/_pending.json");

// ── Config ────────────────────────────────────────────────────────────────────
const OLLAMA_URL       = process.env.OLLAMA_URL  ?? "http://localhost:11434";
const OLLAMA_MODEL     = process.env.EMBED_MODEL ?? "nomic-embed-text";   // fallback; usa embedding-gemma se disponível
const EMBED_MODEL_PREF = "mxbai-embed-large";                              // overridável via env

const QDRANT_URL        = process.env.QDRANT_URL       ?? "http://localhost:6333";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION ?? "hmc_episodic";
const VECTOR_SIZE       = 768;   // embedding-gemma dim; ajustar se modelo mudar

// ── Estado interno ────────────────────────────────────────────────────────────
let _qdrantHealthy  = false;
let _ollamaHealthy  = false;
let _embedModel     = null;   // modelo resolvido após probe
let _syncTimer      = null;
let _pendingCache   = [];     // fila de upserts pendentes (em memória + arquivo)

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} — ${url}`);
  return r.json();
}

function summarize(messages) {
  // Gera texto comprimido de uma sessão de chat para embedding
  return messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role === "user" ? "USR" : "AGT"}: ${String(m.content ?? "").slice(0, 400)}`)
    .join("\n")
    .slice(0, 4000);
}

// ── Ollama ────────────────────────────────────────────────────────────────────
async function probeOllama() {
  try {
    const data = await fetchJSON(`${OLLAMA_URL}/api/tags`);
    _ollamaHealthy = true;
    // Prefere embedding-gemma, senão nomic-embed-text, senão qualquer embed
    const models = (data.models ?? []).map(m => m.name ?? m.model ?? "");
    const preferred = ["embedding-gemma", "mxbai-embed-large", "nomic-embed-text"];
    _embedModel = preferred.find(p => models.some(m => m.includes(p.split(":")[0])))
                  ?? models.find(m => m.includes("embed"))
                  ?? OLLAMA_MODEL;
    return true;
  } catch {
    _ollamaHealthy = false;
    return false;
  }
}

async function embed(text) {
  if (!_ollamaHealthy) await probeOllama();
  if (!_ollamaHealthy) throw new Error("Ollama indisponível");

  const data = await fetchJSON(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    body: JSON.stringify({ model: _embedModel, prompt: text }),
  });
  return data.embedding;  // float[]
}

// ── Qdrant ────────────────────────────────────────────────────────────────────
async function probeQdrant() {
  try {
    await fetchJSON(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`);
    _qdrantHealthy = true;
    return true;
  } catch (e) {
    // Tenta criar a coleção se não existir
    if (e.message?.includes("404")) {
      try {
        await fetchJSON(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
          method: "PUT",
          body: JSON.stringify({
            vectors: { size: VECTOR_SIZE, distance: "Cosine" },
          }),
        });
        _qdrantHealthy = true;
        return true;
      } catch {
        _qdrantHealthy = false;
        return false;
      }
    }
    _qdrantHealthy = false;
    return false;
  }
}

async function qdrantUpsert(points) {
  // points: [{ id, vector, payload }]
  await fetchJSON(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points`, {
    method: "PUT",
    body: JSON.stringify({ points }),
  });
}

async function qdrantSearch(vector, agentId, topK = 5) {
  const data = await fetchJSON(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`, {
    method: "POST",
    body: JSON.stringify({
      vector,
      limit: topK,
      filter: agentId ? { must: [{ key: "agent_id", match: { value: agentId } }] } : undefined,
      with_payload: true,
    }),
  });
  return data.result ?? [];
}

// ── Cache local ───────────────────────────────────────────────────────────────
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true });
}

async function loadPendingCache() {
  try {
    const raw = await readFile(PENDING_FILE, "utf8");
    _pendingCache = JSON.parse(raw);
  } catch {
    _pendingCache = [];
  }
}

async function savePendingCache() {
  await ensureCacheDir();
  await writeFile(PENDING_FILE, JSON.stringify(_pendingCache, null, 2));
}

async function cacheLocally(point) {
  // Salva o ponto individualmente + adiciona à fila
  await ensureCacheDir();
  const file = join(CACHE_DIR, `${point.payload.session_id}.json`);
  await writeFile(file, JSON.stringify(point, null, 2));
  _pendingCache.push(point.payload.session_id);
  await savePendingCache();
}

// ── Sync cache → Qdrant ───────────────────────────────────────────────────────
export async function syncPendingCache() {
  if (_pendingCache.length === 0) return { synced: 0, remaining: 0 };

  const ok = await probeQdrant();
  if (!ok) return { synced: 0, remaining: _pendingCache.length };

  let synced = 0;
  const failed = [];

  for (const sessionId of _pendingCache) {
    try {
      const file = join(CACHE_DIR, `${sessionId}.json`);
      if (!existsSync(file)) { synced++; continue; }
      const point = JSON.parse(await readFile(file, "utf8"));
      await qdrantUpsert([point]);
      synced++;
    } catch {
      failed.push(sessionId);
    }
  }

  _pendingCache = failed;
  await savePendingCache();
  return { synced, remaining: failed.length };
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Salva uma sessão de chat como memória episódica.
 * Gera embedding via Ollama, armazena no Qdrant ou cache local.
 */
export async function upsertSession(agentId, messages, metadata = {}) {
  if (!messages || messages.length === 0) return { status: "skipped", reason: "empty" };

  const text = summarize(messages);
  if (text.length < 20) return { status: "skipped", reason: "too short" };

  const sessionId = metadata.sessionId ?? randomUUID();
  const ts        = new Date().toISOString();

  // Gera embedding
  let vector;
  try {
    vector = await embed(text);
  } catch (e) {
    return { status: "error", reason: `embedding failed: ${e.message}` };
  }

  const point = {
    id:      randomUUID(),   // Qdrant requer string ou uint64
    vector,
    payload: {
      agent_id:   agentId,
      session_id: sessionId,
      ts,
      msg_count:  messages.length,
      summary:    text.slice(0, 500),
      ...metadata,
    },
  };

  // Tenta Qdrant
  const qdrantOk = await probeQdrant();
  if (qdrantOk) {
    try {
      await qdrantUpsert([point]);
      // Salva também summary .md em hive/memory/
      await saveMarkdownSummary(agentId, sessionId, text, ts, messages.length);
      return { status: "ok", backend: "qdrant", session_id: sessionId };
    } catch (e) {
      // Qdrant falhou durante upsert — cai no cache
      console.error(`[episodic] qdrant upsert falhou, cacheando: ${e.message}`);
    }
  }

  // Cache local
  await cacheLocally(point);
  await saveMarkdownSummary(agentId, sessionId, text, ts, messages.length);
  return { status: "cached", backend: "local", session_id: sessionId, pending: _pendingCache.length };
}

/**
 * Busca semântica nas memórias do agente.
 */
export async function queryMemory(agentId, queryText, topK = 5) {
  let vector;
  try {
    vector = await embed(queryText);
  } catch (e) {
    return { status: "error", reason: `embedding failed: ${e.message}`, results: [] };
  }

  // Tenta Qdrant
  const qdrantOk = await probeQdrant();
  if (qdrantOk) {
    try {
      const results = await qdrantSearch(vector, agentId, topK);
      return {
        status:  "ok",
        backend: "qdrant",
        results: results.map(r => ({
          score:      r.score,
          session_id: r.payload.session_id,
          ts:         r.payload.ts,
          summary:    r.payload.summary,
          msg_count:  r.payload.msg_count,
        })),
      };
    } catch (e) {
      console.error(`[episodic] qdrant search falhou: ${e.message}`);
    }
  }

  // Fallback: busca local por cosine similarity (sem Qdrant)
  const localResults = await localSearch(agentId, vector, topK);
  return { status: "ok", backend: "local_cache", results: localResults };
}

// ── Busca local (fallback sem Qdrant) ────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; ma += a[i] ** 2; mb += b[i] ** 2; }
  return dot / (Math.sqrt(ma) * Math.sqrt(mb) + 1e-8);
}

async function localSearch(agentId, vector, topK) {
  await ensureCacheDir();
  let files;
  try { files = await readdir(CACHE_DIR); } catch { return []; }
  const jsonFiles = files.filter(f => f.endsWith(".json") && f !== "_pending.json");

  const scored = [];
  for (const f of jsonFiles) {
    try {
      const point = JSON.parse(await readFile(join(CACHE_DIR, f), "utf8"));
      if (agentId && point.payload?.agent_id !== agentId) continue;
      const sim = cosineSim(vector, point.vector);
      scored.push({ score: sim, ...point.payload });
    } catch {}
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => ({ score: r.score, session_id: r.session_id, ts: r.ts, summary: r.summary, msg_count: r.msg_count }));
}

// ── Summary markdown ──────────────────────────────────────────────────────────
async function saveMarkdownSummary(agentId, sessionId, text, ts, msgCount) {
  try {
    const memDir = join(ROOT, "hive/memory");
    if (!existsSync(memDir)) await mkdir(memDir, { recursive: true });
    const file    = join(memDir, `${agentId}.md`);
    const content = existsSync(file) ? await readFile(file, "utf8") : "";
    const entry   = `\n## Sessão ${sessionId.slice(0, 8)} — ${ts}\n*${msgCount} mensagens*\n\n${text.slice(0, 800)}\n`;
    await writeFile(file, content + entry);
  } catch {}
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export async function getStats() {
  await probeOllama();
  await probeQdrant();
  return {
    ollama:  { healthy: _ollamaHealthy, url: OLLAMA_URL, model: _embedModel },
    qdrant:  { healthy: _qdrantHealthy, url: QDRANT_URL, collection: QDRANT_COLLECTION },
    pending: _pendingCache.length,
  };
}

// ── Init ──────────────────────────────────────────────────────────────────────
export async function initEpisodic() {
  await ensureCacheDir();
  await loadPendingCache();
  await probeOllama();
  await probeQdrant();

  // Tenta sincronizar cache pendente na inicialização
  if (_pendingCache.length > 0) {
    const result = await syncPendingCache();
    if (result.synced > 0) {
      console.log(`[episodic] sync inicial: ${result.synced} sessões enviadas ao Qdrant`);
    }
  }

  // Sincroniza a cada 5 minutos
  _syncTimer = setInterval(syncPendingCache, 5 * 60 * 1000);

  console.log(`[episodic] ollama=${_ollamaHealthy ? "ok" : "offline"} qdrant=${_qdrantHealthy ? "ok" : "offline"} pending=${_pendingCache.length}`);
  return { ollama: _ollamaHealthy, qdrant: _qdrantHealthy };
}
