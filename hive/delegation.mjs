#!/usr/bin/env node
/**
 * 🧬 Recursive Delegation Module — Zâmbias spawnando Zâmbias
 * 
 * Permite que qualquer agente (inclusive Zâmbias) criem subordinados.
 * Suporta hierarquias N-levels com rastreamento de ancestry.
 */

import { readFile, writeFile, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dir);

const HIVE_PATH = join(ROOT, "hive", "agents.json");
const KANBAN_PATH = join(ROOT, "kanban", "tasks.json");
const EVENTS_PATH = join(ROOT, "ops", "events.jsonl");

/**
 * Spawna um subagente (Zâmbia) a partir de um agente existente
 * @param {string} parentId - ID do agente pai (pode ser zambia ou native)
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Object>} Dados do agente criado
 */
export async function spawnSubordinate(parentId, options = {}) {
  // Carregar hive
  const hive = JSON.parse(await readFile(HIVE_PATH, "utf8"));
  
  // Verificar se pai existe
  const parent = hive.agents.find(a => a.id === parentId);
  if (!parent) {
    throw new Error(`Agente pai '${parentId}' não encontrado`);
  }
  
  // Verificar limite de profundidade (max 3 níveis)
  const depth = calculateDepth(parent, hive.agents);
  if (depth >= 3) {
    throw new Error(`Limite de profundidade atingido (max 3 níveis). Pai está no nível ${depth}`);
  }
  
  // Criar novo agente
  const agentId = `zmb-${randomUUID().slice(0, 8)}`;
  const chatKey = `agt-${Date.now().toString(36)}`;
  const taskId = randomUUID().slice(0, 8);
  
  const agent = {
    id: agentId,
    name: options.name || `Zâmbia-${chatKey.slice(-6)}`,
    type: "zambia",
    parent: parentId,
    ancestry: buildAncestry(parent, hive.agents),
    creator: parent.name || parentId,
    born: new Date().toISOString(),
    status: "in_progress",
    heartbeat: new Date().toISOString(),
    soul: options.soul || parent.soul || "souls/code.yaml",
    skills: options.skills || parent.skills || [],
    mission: options.mission || "Subtarefa delegada",
    domain: options.domain || parent.domain || "execution",
    providerID: options.provider || parent.providerID || "kimi-for-coding",
    modelID: options.model || parent.modelID || "k2p5",
    chatKey: chatKey,
    taskId: taskId,
    depth: depth + 1,
    memory: null,
    stats: { messages_sent: 0, tokens_used: 0, cost_usd: 0, uptime_ms: 0 }
  };
  
  // Criar task associada
  const task = {
    id: taskId,
    title: options.taskTitle || `🔹 Subtarefa: ${agent.mission.slice(0, 50)}...`,
    domain: agent.domain,
    agent: chatKey,
    providerID: agent.providerID,
    modelID: agent.modelID,
    chatKey: chatKey,
    priority: options.priority || "medium",
    status: "pending",
    parent_task: parent.taskId || null,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    result: null,
    events: [{ 
      ts: new Date().toISOString(), 
      from: "system", 
      to: "pending", 
      note: `Delegada por ${parent.name || parentId} (nível ${depth + 1})` 
    }]
  };
  
  // Persistir
  hive.agents.push(agent);
  hive.updated = new Date().toISOString();
  await writeFile(HIVE_PATH, JSON.stringify(hive, null, 2));
  
  const kanban = JSON.parse(await readFile(KANBAN_PATH, "utf8"));
  kanban.tasks.push(task);
  kanban.updated = new Date().toISOString();
  await writeFile(KANBAN_PATH, JSON.stringify(kanban, null, 2));
  
  // Log event
  await logEvent({
    event: "agent_spawned_recursive",
    agent_id: agentId,
    parent_id: parentId,
    depth: depth + 1,
    creator: parent.name || parentId
  });
  
  return { agent, task };
}

/**
 * Lista todos os descendentes de um agente
 * @param {string} agentId 
 * @returns {Promise<Array>} Lista de descendentes
 */
export async function listDescendants(agentId) {
  const hive = JSON.parse(await readFile(HIVE_PATH, "utf8"));
  const descendants = [];
  
  function findChildren(parentId, level = 0) {
    const children = hive.agents.filter(a => a.parent === parentId);
    for (const child of children) {
      descendants.push({ ...child, level });
      findChildren(child.id, level + 1);
    }
  }
  
  findChildren(agentId);
  return descendants;
}

/**
 * Calcula estatísticas de uma hierarquia
 * @param {string} rootId 
 * @returns {Promise<Object>} Estatísticas
 */
export async function getHierarchyStats(rootId) {
  const descendants = await listDescendants(rootId);
  const hive = JSON.parse(await readFile(HIVE_PATH, "utf8"));
  const root = hive.agents.find(a => a.id === rootId);
  
  const byDepth = {};
  descendants.forEach(d => {
    byDepth[d.level] = (byDepth[d.level] || 0) + 1;
  });
  
  const byStatus = {};
  descendants.forEach(d => {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  });
  
  return {
    root: root?.name || rootId,
    total_descendants: descendants.length,
    max_depth: Math.max(0, ...descendants.map(d => d.level)),
    by_depth: byDepth,
    by_status: byStatus,
    agents: descendants.map(d => ({ id: d.id, name: d.name, depth: d.level, status: d.status }))
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateDepth(agent, allAgents) {
  let depth = 0;
  let current = agent;
  
  while (current.parent) {
    depth++;
    current = allAgents.find(a => a.id === current.parent);
    if (!current) break;
    if (depth > 10) break; // Safety limit
  }
  
  return depth;
}

function buildAncestry(agent, allAgents) {
  const ancestry = [];
  let current = agent;
  
  while (current) {
    ancestry.unshift(current.id);
    if (!current.parent) break;
    current = allAgents.find(a => a.id === current.parent);
    if (!current) break;
  }
  
  return ancestry;
}

async function logEvent(event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  await appendFile(EVENTS_PATH, line, "utf8");
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  
  switch (cmd) {
    case "spawn": {
      const parentId = process.argv[3];
      const mission = process.argv.slice(4).join(" ");
      if (!parentId || !mission) {
        console.error("Uso: node delegation.mjs spawn <parent-id> <missão>");
        process.exit(1);
      }
      const result = await spawnSubordinate(parentId, { mission, taskTitle: mission.slice(0, 50) });
      console.log(`✓ Subordinado criado: ${result.agent.id}`);
      console.log(`  Task: ${result.task.id}`);
      break;
    }
    
    case "tree": {
      const rootId = process.argv[3] || "agt-code-native";
      const stats = await getHierarchyStats(rootId);
      console.log("\n📊 Hierarquia de Agentes\n");
      console.log(`  Root: ${stats.root}`);
      console.log(`  Total: ${stats.total_descendants} descendentes`);
      console.log(`  Profundidade máxima: ${stats.max_depth}`);
      console.log("\n  Por nível:", stats.by_depth);
      console.log("  Por status:", stats.by_status);
      console.log("\n  Agentes:");
      stats.agents.forEach(a => {
        console.log(`    ${"  ".repeat(a.depth)}${a.name} (${a.id}) [${a.status}]`);
      });
      break;
    }
    
    default:
      console.log(`
🧬 Recursive Delegation Module

Uso: node delegation.mjs <comando>

Comandos:
  spawn <parent-id> <missão>    Cria subordinado
  tree [root-id]                Mostra hierarquia

Exemplos:
  node delegation.mjs spawn agt-code-native "Implementar feature X"
  node delegation.mjs tree agt-code-native
`);
  }
}
