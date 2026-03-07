/**
 * Kilo Adapter — HTTP client para kilo serve (OpenCode API v0.0.3)
 *
 * API real (descoberta via GET /doc):
 *   POST /session                       → cria sessão { providerID, modelID }
 *   POST /session/{id}/message          → envia prompt síncrono
 *   GET  /global/health                 → health check
 *   GET  /provider                      → lista providers e modelos
 *   GET  /agent                         → lista agentes Kilo nativos
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(
  await readFile(join(__dir, "config.json"), "utf8")
);

const BASE = cfg.base_url;

// ─── Display names dos providers ─────────────────────────────────────────────

const PROVIDER_DISPLAY = {
  "kilo":               "Kilo Gateway",
  "opencode":           "OpenCode Zen",
  "openai":             "OpenAI",
  "github-copilot":     "GitHub Copilot",
  "kimi-for-coding":    "Kimi For Coding",
  "zai":                "Z.AI",
  "bailian-coding-plan":"Model Studio (Alibaba)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function safeJson(res) {
  const raw = await res.text();
  const ct  = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    throw new Error(
      `kilo serve returned non-JSON (${res.status} ${ct}): ${raw.slice(0, 200)}`
    );
  }
  try { return JSON.parse(raw); }
  catch { throw new Error(`JSON parse failed: ${raw.slice(0, 200)}`); }
}

function extractText(parts) {
  return (parts ?? [])
    .filter(p => p.type === "text")
    .map(p => p.text ?? "")
    .join("");
}

// ─── Session ─────────────────────────────────────────────────────────────────

export async function createSession(providerID, modelID) {
  const res = await fetch(`${BASE}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerID, modelID }),
    signal: AbortSignal.timeout(cfg.timeout_ms),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createSession failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  return safeJson(res);
}

/**
 * Envia prompt (ou parts multimodal) para uma sessão.
 * @param {string} sessionId
 * @param {string} providerID
 * @param {string} modelID
 * @param {string} text          - texto principal (usado se parts não fornecido)
 * @param {string} [agent]       - agente Kilo: "code"|"plan"|"debug"|"orchestrator"|"ask"
 * @param {AbortSignal} [signal] - AbortSignal externo para cancelamento
 * @param {Array} [parts]        - parts multimodal (override de text); ex: [{type:"image_url",...}]
 */
export async function sendMessage(sessionId, providerID, modelID, text, agent, signal, parts) {
  const bodyParts = parts ?? [{ type: "text", text }];
  const bodyObj = {
    model: { providerID, modelID },
    parts: bodyParts,
  };
  if (agent) bodyObj.agent = agent;

  const res = await fetch(`${BASE}/session/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
    signal: signal ?? AbortSignal.timeout(cfg.timeout_ms),
  });
  if (!res.ok) {
    const b = await res.text();
    throw new Error(`sendMessage failed [${res.status}]: ${b.slice(0, 300)}`);
  }
  const data = await safeJson(res);
  return {
    text:   extractText(data.parts),
    tokens: data.info?.tokens ?? {},
    cost:   data.info?.cost ?? 0,
    agent:  data.info?.agent ?? agent ?? "code",
    info:   data.info,
    parts:  data.parts,
  };
}

/**
 * Tenta cancelar uma sessão Kilo em andamento.
 * Estratégia 1: DELETE /session/{id} — se Kilo suportar.
 * Estratégia 2: retorna false (caller usa AbortController.abort()).
 * @param {string} sessionId
 * @returns {Promise<boolean>} true se Kilo confirmou cancelamento
 */
export async function stopSession(sessionId) {
  try {
    const res = await fetch(`${BASE}/session/${sessionId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

// ─── Providers & Agents ───────────────────────────────────────────────────────

/**
 * Lista providers autenticados com seus modelos.
 * @returns {Promise<Array<{id, displayName, models: string[]}>>}
 */
export async function listAuthedProviders() {
  const res = await fetch(`${BASE}/provider`, {
    signal: AbortSignal.timeout(cfg.timeout_ms),
  });
  if (!res.ok) throw new Error(`listProviders failed: ${res.status}`);
  const data = await safeJson(res);

  // `data.authed` é array de provider IDs autenticados
  const authedIds = new Set(
    Array.isArray(data.authed) ? data.authed : []
  );

  // `data.all` é array de provider objects
  const all = Array.isArray(data.all) ? data.all : [];

  return all
    .filter(p => authedIds.has(p.id) || Boolean(p.authed))
    .map(p => ({
      id:          p.id,
      displayName: PROVIDER_DISPLAY[p.id] ?? p.name ?? p.id,
      models:      Object.keys(p.models ?? {}),
    }))
    .filter(p => p.models.length > 0);
}

/**
 * Lista agentes Kilo nativos (primários, não ocultos).
 * @returns {Promise<Array<{name, description, mode}>>}
 */
export async function listAgents() {
  const res = await fetch(`${BASE}/agent`, {
    signal: AbortSignal.timeout(cfg.timeout_ms),
  });
  if (!res.ok) throw new Error(`listAgents failed: ${res.status}`);
  const data = await safeJson(res);
  return data
    .filter(a => !a.hidden && a.mode === "primary")
    .map(a => ({ name: a.name, description: a.description ?? "", mode: a.mode }));
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function healthCheck() {
  try {
    const res = await fetch(`${BASE}/global/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = await safeJson(res);
    return data?.healthy === true;
  } catch {
    return false;
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Fluxo completo: cria sessão → envia prompt com agente Kilo → retorna resultado.
 *
 * @param {string} providerID
 * @param {string} modelID
 * @param {string} prompt
 * @param {function} [onChunk]
 * @param {string} [agent]  agente Kilo: "code"|"plan"|"debug"|"orchestrator"|"ask"
 */
export async function dispatch(providerID, modelID, prompt, onChunk, agent = "code") {
  const t0      = Date.now();
  const session = await createSession(providerID, modelID);
  const reply   = await sendMessage(session.id, providerID, modelID, prompt, agent);
  onChunk?.(reply.text);
  return {
    sessionId:  session.id,
    result:     reply.text,
    tokens:     reply.tokens,
    cost:       reply.cost,
    agent:      reply.agent,
    latency_ms: Date.now() - t0,
  };
}
