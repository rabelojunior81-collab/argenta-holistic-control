#!/usr/bin/env node
/**
 * 🫀 Heartbeat Colony — Comunicação a cada 90 segundos
 * 
 * Zâmbias postam progresso no bulletin board a cada 90s.
 * Permite acompanhamento em tempo real da orquestração.
 */

import { readFile, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dir);

const HIVE_PATH = join(ROOT, "hive", "agents.json");
const KANBAN_PATH = join(ROOT, "kanban", "tasks.json");
const EVENTS_PATH = join(ROOT, "ops", "events.jsonl");

const HEARTBEAT_INTERVAL_MS = 90_000; // 90 segundos
const COLONY_AGENTS = [
  { id: 'zmb-4f403cf3', name: 'UI-Architect', role: 'frontend' },
  { id: 'zmb-90630772', name: 'API-Engineer', role: 'backend' },
  { id: 'zmb-470e145e', name: 'Integration-Tester', role: 'qa' }
];

async function postToBus(from, content) {
  try {
    await fetch('http://127.0.0.1:3030/api/bus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: 'broadcast',
        topic: 'orchestration',
        content: `[HEARTBEAT 90s] ${content}`
      })
    });
  } catch (err) {
    // Silencioso - não quebra o loop
  }
}

async function logEvent(event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  await appendFile(EVENTS_PATH, line, "utf8");
}

async function checkAgentStatus(agentInfo) {
  const hive = JSON.parse(await readFile(HIVE_PATH, "utf8"));
  const kanban = JSON.parse(await readFile(KANBAN_PATH, "utf8"));
  
  const agent = hive.agents.find(a => a.id === agentInfo.id);
  const task = kanban.tasks.find(t => t.id === agent?.taskId);
  
  if (!agent || !task) return null;
  
  return {
    name: agent.name,
    status: agent.status,
    taskStatus: task.status,
    taskTitle: task.title.slice(0, 40),
    hasResult: !!task.result
  };
}

async function heartbeat() {
  console.log(`[heartbeat] ${new Date().toISOString()} — Colony check`);
  
  for (const agentInfo of COLONY_AGENTS) {
    const status = await checkAgentStatus(agentInfo);
    if (!status) continue;
    
    let message = '';
    
    if (status.taskStatus === 'pending') {
      message = `${status.name}: Aguardando início | Task: ${status.taskStatus}`;
    } else if (status.taskStatus === 'in_progress') {
      message = `${status.name}: Executando... | Task: ${status.taskStatus} ⚙️`;
    } else if (status.taskStatus === 'review') {
      message = `${status.name}: Concluído ✅ | Task: ${status.taskStatus} | Result: ${status.hasResult ? 'com dados' : 'vazio'}`;
    } else if (status.taskStatus === 'blocked') {
      message = `${status.name}: BLOQUEADO ❌ | Task: ${status.taskStatus} — Precisa de ajuda!`;
    } else if (status.taskStatus === 'done') {
      message = `${status.name}: FINALIZADO 🎉 | Task: ${status.taskStatus}`;
    }
    
    if (message) {
      await postToBus(status.name, message);
      await logEvent({
        event: 'heartbeat_colony',
        agent: agentInfo.id,
        status: status.taskStatus,
        message: message.slice(0, 100)
      });
    }
  }
}

async function run() {
  console.log('[heartbeat] Colony heartbeat iniciado (90s intervalo)');
  console.log('[heartbeat] Agentes:', COLONY_AGENTS.map(a => a.name).join(', '));
  
  // Primeiro heartbeat imediato
  await heartbeat();
  
  // Loop a cada 90s
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  
  // Manter vivo
  process.on('SIGINT', () => {
    console.log('\n[heartbeat] Desligando...');
    process.exit(0);
  });
}

await run();
