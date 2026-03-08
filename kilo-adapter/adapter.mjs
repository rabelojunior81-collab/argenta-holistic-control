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

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dir);
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

// ═══════════════════════════════════════════════════════════════════════════════
// MCP (Model Context Protocol) — Extensão de Capacidades
// ═══════════════════════════════════════════════════════════════════════════════

const MCP_CONFIG_PATH = join(ROOT, "mcp-config.json");

/**
 * Carrega a configuração MCP do kilo.json
 * @returns {Promise<{mcp: Record<string, any>}>}
 */
async function loadMcpConfig() {
  try {
    const content = await readFile(MCP_CONFIG_PATH, "utf8");
    return JSON.parse(content);
  } catch {
    return { mcp: {} };
  }
}

/**
 * Salva a configuração MCP no kilo.json
 * @param {Object} config
 */
async function saveMcpConfig(config) {
  await writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

/**
 * Lista todos os servidores MCP configurados.
 * @returns {Promise<Array<{name, type, enabled, description, config}>>}
 */
export async function listMcpServers() {
  const config = await loadMcpConfig();
  const servers = config.mcp || {};
  
  return Object.entries(servers).map(([name, serverConfig]) => ({
    name,
    type: serverConfig.type || "local",
    enabled: serverConfig.enabled !== false,
    description: serverConfig.description || "",
    config: serverConfig,
  }));
}

/**
 * Obtém um servidor MCP específico.
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
export async function getMcpServer(name) {
  const config = await loadMcpConfig();
  const servers = config.mcp || {};
  return servers[name] || null;
}

/**
 * Adiciona ou atualiza um servidor MCP.
 * @param {string} name - nome único do servidor
 * @param {Object} serverConfig - configuração do servidor
 * @param {string} serverConfig.type - "local" ou "remote"
 * @param {string[]} [serverConfig.command] - comando para servidores locais
 * @param {string} [serverConfig.url] - URL para servidores remotos
 * @param {boolean} [serverConfig.enabled] - se está habilitado
 * @param {string} [serverConfig.description] - descrição opcional
 * @param {Object} [serverConfig.environment] - variáveis de ambiente (local)
 * @param {Object} [serverConfig.headers] - headers HTTP (remote)
 */
export async function addMcpServer(name, serverConfig) {
  const config = await loadMcpConfig();
  if (!config.mcp) config.mcp = {};
  
  config.mcp[name] = {
    ...serverConfig,
    enabled: serverConfig.enabled !== false,
  };
  
  await saveMcpConfig(config);
  return { success: true, name, config: config.mcp[name] };
}

/**
 * Remove um servidor MCP.
 * @param {string} name
 * @returns {Promise<{success: boolean}>}
 */
export async function removeMcpServer(name) {
  const config = await loadMcpConfig();
  if (!config.mcp || !config.mcp[name]) {
    return { success: false, error: `Servidor MCP '${name}' não encontrado` };
  }
  
  delete config.mcp[name];
  await saveMcpConfig(config);
  return { success: true };
}

/**
 * Habilita ou desabilita um servidor MCP.
 * @param {string} name
 * @param {boolean} enabled
 * @returns {Promise<{success: boolean, enabled: boolean}>}
 */
export async function toggleMcpServer(name, enabled) {
  const config = await loadMcpConfig();
  if (!config.mcp || !config.mcp[name]) {
    return { success: false, error: `Servidor MCP '${name}' não encontrado` };
  }
  
  config.mcp[name].enabled = enabled;
  await saveMcpConfig(config);
  return { success: true, enabled };
}

/**
 * Descobre ferramentas disponíveis em um servidor MCP local.
 * Nota: Para servidores MCP funcionarem, o Kilo CLI deve estar rodando com a config.
 * Esta função consulta o Kilo Serve para obter as tools disponíveis.
 * @param {string} serverName
 * @returns {Promise<Array<{name, description, parameters}>>}
 */
export async function listMcpTools(serverName) {
  try {
    // Tenta obter do Kilo Serve se expuser endpoint MCP
    const res = await fetch(`${BASE}/mcp/tools`, {
      signal: AbortSignal.timeout(cfg.timeout_ms),
    });
    if (res.ok) {
      const data = await safeJson(res);
      if (serverName) {
        return data.tools?.filter(t => t.server === serverName) || [];
      }
      return data.tools || [];
    }
  } catch {
    // Fallback: retorna tools conhecidas dos servers padrão
  }
  
  // Tools conhecidas dos servidores MCP populares
  const KNOWN_TOOLS = {
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
  };
  
  return KNOWN_TOOLS[serverName] || [];
}

/**
 * Invoca uma ferramenta MCP via Kilo Serve.
 * @param {string} serverName - nome do servidor MCP
 * @param {string} toolName - nome da ferramenta
 * @param {Object} args - argumentos da ferramenta
 * @returns {Promise<any>}
 */
export async function invokeMcpTool(serverName, toolName, args = {}) {
  // Verifica se o servidor está habilitado
  const server = await getMcpServer(serverName);
  if (!server) {
    throw new Error(`Servidor MCP '${serverName}' não encontrado`);
  }
  if (server.enabled === false) {
    throw new Error(`Servidor MCP '${serverName}' está desabilitado`);
  }
  
  try {
    const res = await fetch(`${BASE}/mcp/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        server: serverName,
        tool: toolName,
        arguments: args,
      }),
      signal: AbortSignal.timeout(cfg.timeout_ms),
    });
    
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`invokeMcpTool failed [${res.status}]: ${err.slice(0, 300)}`);
    }
    
    return safeJson(res);
  } catch (err) {
    // Se Kilo Serve não expõe endpoint MCP, simula a resposta para desenvolvimento
    if (err.message?.includes("fetch failed") || err.message?.includes("ECONNREFUSED")) {
      return {
        simulated: true,
        server: serverName,
        tool: toolName,
        arguments: args,
        result: null,
        message: "Kilo Serve MCP endpoint não disponível. Tools MCP funcionam via Kilo CLI.",
      };
    }
    throw err;
  }
}

/**
 * Retorna o status completo da integração MCP.
 * @returns {Promise<Object>}
 */
export async function getMcpStatus() {
  const servers = await listMcpServers();
  const enabledCount = servers.filter(s => s.enabled).length;
  
  return {
    available: true,
    configPath: MCP_CONFIG_PATH,
    servers: {
      total: servers.length,
      enabled: enabledCount,
      disabled: servers.length - enabledCount,
      list: servers,
    },
    kiloServe: {
      baseUrl: BASE,
      healthy: await healthCheck(),
    },
  };
}
