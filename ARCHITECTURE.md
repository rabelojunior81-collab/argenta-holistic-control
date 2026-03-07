# ARCHITECTURE — Holistic Mission Control
> Mapa técnico vivo do sistema.
> Atualizado pelo Protocolo Scribe a cada sprint.
> Última atualização: Sprint 7.3 — 2026-03-07

---

## TL;DR — Entenda o sistema em 90 segundos

**O que é:** Servidor HTTP+WebSocket Node.js (porta 3030) que serve um dashboard
web para orquestrar uma colmeia de agentes IA. Cada agente tem identidade
(character chart), alma (soul YAML), habilidades (skills YAML) e é conectado
ao Kilo Code (porta 4096) como substrato de inferência.

**Stack:** Node.js puro (sem framework), ESM modules, js-yaml, WebSocket manual
(RFC 6455), persistência em JSON/JSONL, sem banco de dados externo.

**Entrypoints:**
```
npm run ui    → node ui/server.mjs      (porta 3030 — dashboard + API)
npm run mc    → node cli/mc.mjs         (argenta-CLI)
npm run serve → kilo-adapter/server-manager.mjs start  (porta 4096 — Kilo)
```

---

## 1. Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 4 — argenta-CLI (cli/mc.mjs)                              │
│  6 comandos: status · agent · board · task · hive · chat        │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3 — Mission Control UI (ui/index.html + ui/server.mjs)    │
│  Hive Panel · Bulletin Board · Agent Control · Character Chart  │
│  Help Panel · Spawn Modal · Chat Overlay · Kanban               │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2 — Hive Bus (bus/messages.jsonl)                         │
│  pub/sub · 9 tópicos · threads · replies · WS push             │
├─────────────────────────────────────────────────────────────────┤
│  TIER 1 — Agent Identity Layer                                  │
│  souls/*.yaml · skills/*.yaml · characters/*.yaml              │
│  hive/agents.json · hive/heartbeats.jsonl · hive/memory/       │
├─────────────────────────────────────────────────────────────────┤
│  TIER 0 — Substrato                                             │
│  Kilo Code (:4096) · ops/events.jsonl · ops/chat-sessions.json │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Servidor HTTP (ui/server.mjs)

**1262 linhas.** Todos os endpoints em um único arquivo switch/if.
WebSocket manual implementado via RFC 6455 (sem dependências externas).

### Constantes de caminho (linhas 43-54)
```
KANBAN          → kanban/tasks.json
EVENTS          → ops/events.jsonl
STATE           → ops/state.json
KILO_CFG        → kilo-adapter/config.json
MATRIX          → expertise-matrix/matrix.yaml
CHARACTERS      → expertise-matrix/characters/
CHAT_SESSIONS_F → ops/chat-sessions.json
HIVE_AGENTS_F   → hive/agents.json
HIVE_BEATS_F    → hive/heartbeats.jsonl
BUS_F           → bus/messages.jsonl
SKILLS_DIR      → skills/
SOULS_DIR       → souls/
```

### Loops internos (setInterval)
```
pollEvents()          → a cada 1.5s — tail de events.jsonl → WS broadcast
broadcastState()      → a cada 3s   — state + kilo health → WS broadcast
zombieCheck()         → a cada 30s  — heartbeat > 2min → marca zombie
syncNativeAgentStatus → a cada 5s   — sync status nativos + auto-close zambias
```

### Inicialização
```
loadChatSessions()      → restaura sessões persistidas
syncNativeAgentStatus() → sincronização inicial
server.listen(3030)
```

---

## 3. Endpoints da API (21 rotas)

### Core
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Serve index.html |
| GET | `/api/state` | ops/state.json + kilo health |
| GET | `/api/health` | health check completo |
| GET | `/api/matrix` | expertise-matrix/matrix.yaml parseado |
| GET | `/api/agents` | agentes primários Kilo (via kilo serve) |
| GET | `/api/providers` | providers autenticados (via kilo serve) |
| GET | `/api/events` | últimas N linhas de events.jsonl |
| DELETE | `/api/events` | remove evento por ts |

### Kanban
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/tasks` | todas as tasks |
| POST | `/api/tasks` | criar task |
| PATCH | `/api/tasks/:id` | mover / atualizar |
| DELETE | `/api/tasks/:id` | remover |

### Chat
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/chat` | enviar msg → Kilo (background) |
| GET | `/api/chat/:key` | histórico da sessão |
| DELETE | `/api/chat/:key` | limpar sessão |
| POST | `/api/stop/:key` | interromper sessão |
| POST | `/api/dispatch` | fire-and-forget dispatch |

### Hive
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/hive/agents` | todos os agentes |
| POST | `/api/hive/agents` | registrar agente |
| GET | `/api/hive/agents/:id` | detalhes + character + chat |
| PATCH | `/api/hive/agents/:id` | atualizar campos |
| DELETE | `/api/hive/agents/:id` | remover agente |
| POST | `/api/hive/agents/:id/heartbeat` | pulso do agente |
| GET | `/api/hive/agents/:id/memory` | sumário de memória + stats |
| POST | `/api/hive/agents/:id/activate` | cria sessão Kilo + injeta soul+skills |

### Bus
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/bus` | mensagens (filtros: topic/from/thread/n) |
| POST | `/api/bus` | nova mensagem |
| PATCH | `/api/bus/:id` | atualizar status/content |
| DELETE | `/api/bus/:id` | remover |
| POST | `/api/bus/:id/reply` | adicionar reply |

### Identity
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/skills` | todas as skills |
| GET | `/api/skills/:name` | skill específica |
| GET | `/api/souls` | todas as souls |
| GET | `/api/souls/:name` | soul específica |
| GET | `/api/characters` | todas as fichas |
| GET | `/api/characters/:agent` | ficha específica |
| PATCH | `/api/characters/:agent` | crescimento orgânico (attributes/resistances/special) |

---

## 4. WebSocket Events

Todos os eventos broadcast via `wsBroadcast(type, payload)`:

| Tipo | Quando | Payload |
|---|---|---|
| `event` | nova linha em events.jsonl | objeto do evento |
| `state` | a cada 3s | state + kilo_serve |
| `task_added` | POST /api/tasks | task |
| `task_updated` | PATCH /api/tasks/:id | task |
| `task_removed` | DELETE /api/tasks/:id | { id } |
| `dispatch_chunk` | streaming dispatch | { task_id, chunk } |
| `dispatch_done` | dispatch concluído | { task_id, result, latency_ms } |
| `dispatch_error` | dispatch falhou | { task_id, error } |
| `chat_user` | msg do usuário enviada | { chatKey, role, text, ts } |
| `chat_thinking` | agente processando | { chatKey } |
| `chat_response` | resposta do agente | { chatKey, text, latency_ms, ts } |
| `chat_stopped` | sessão interrompida | { chatKey, kiloCancelled } |
| `chat_error` | erro na sessão | { chatKey, error } |
| `hive_updated` | mudança em agents.json | {} |
| `agent_zombie` | heartbeat > 2min | { id, name } |
| `agent_autoclosed` | auto_close + idle 5min | { id, name } |
| `bus_message` | novo post no bus | msg |
| `bus_updated` | PATCH/DELETE no bus | { id, deleted? } |
| `character_updated` | PATCH /api/characters/:agent | { agent } |

---

## 5. Agent Identity System

### Flow de injeção de identidade

```
POST /api/hive/agents/:id/activate
  OR
POST /api/chat (primeira mensagem na sessão)
  ↓
loadCharacters() → char = characters[agent]
loadSouls()      → soul = souls[hiveAgent.soul]
loadSkills()     → skillObjs = hiveAgent.skills.map(s => skills[s])
  ↓
buildAgentContext(char, agentName, soul, skillObjs)
  → [MISSION CONTROL — CONTEXTO DO SISTEMA]
  → [SUA IDENTIDADE]
  → [LORE / PROPÓSITO]
  → [FRAQUEZA CONHECIDA]
  → [ALMA / PERSONA]
  → Diretivas · Restrições · Tom
  → [SKILLS ATIVAS]
  → [DIRECTIVA OPERACIONAL]
  ↓
chat.systemCtx = contexto completo
chat.firstMsgPrimed = false

Primeira mensagem enviada ao Kilo:
  textForKilo = systemCtx + userMessage
  chat.firstMsgPrimed = true

Sessão expirada (restored flag):
  → recria sessão Kilo + re-injeta systemCtx
```

### Estrutura de um agente (hive/agents.json)

```json
{
  "id": "agt-code-native",
  "name": "The Forge",
  "type": "native",           // native | zambia
  "parent": null,             // id do agente pai (para zambias)
  "creator": "system",
  "born": "2026-03-05T00:00:00Z",
  "status": "idle",           // idle | in_progress | blocked | zombie | done
  "heartbeat": "...",
  "soul": "kilo-native",
  "skills": [],
  "mission": null,
  "domain": "execution",
  "providerID": "bailian-coding-plan",
  "modelID": "MiniMax-M2.5",
  "chatKey": "code",          // chave da chatSessions Map
  "sessionId": null,
  "auto_close": false,        // zambias: fecha após idle 5min
  "memory": null,
  "stats": { "messages_sent": 0, "tokens_used": 0, "cost_usd": 0, "uptime_ms": 0 }
}
```

---

## 6. argenta-CLI (cli/)

**Entry point:** `cli/mc.mjs` — parseArgs, ANSI colors, API client, shared helpers.

```
cli/
  mc.mjs              ← entry: parseArgs + router + helpers compartilhados
  commands/
    status.mjs        ← mc status [--full]
    agent.mjs         ← mc agent list/show/spawn/stop/talk/skill/redirect/close/memory
    board.mjs         ← mc board read/post/reply/mark-read/delete
    task.mjs          ← mc task list/add/move/remove/show
    hive.mjs          ← mc hive broadcast/snapshot/brainstorm
    chat.mjs          ← mc chat <id> (REPL interativo)
```

**API base:** `http://127.0.0.1:3030/api` (override via `--url` ou `MC_URL`)

---

## 7. Persistência (arquivos de estado)

| Arquivo | Formato | Mutação |
|---|---|---|
| `kanban/tasks.json` | JSON array | read-write completo |
| `ops/events.jsonl` | JSONL append-only | append (delete por ts) |
| `ops/state.json` | JSON | write por Ralph Loop |
| `ops/chat-sessions.json` | JSON map | write a cada msg |
| `hive/agents.json` | JSON array | read-write completo |
| `hive/heartbeats.jsonl` | JSONL append-only | append only |
| `hive/memory/*.md` | Markdown | write por agente ao encerrar |
| `bus/messages.jsonl` | JSONL | append (PATCH reescreve tudo) |
| `expertise-matrix/characters/*.yaml` | YAML | write por PATCH characters |

---

## 8. Integração Kilo Code

```
kilo-adapter/config.json
  base_url: http://127.0.0.1:4096
  health_endpoint: /global/health

kilo-adapter/adapter.mjs
  createSession(providerID, modelID)         → POST /session
  sendMessage(sessionId, prov, model, text)  → POST /session/{id}/message
  stopSession(sessionId)                     → DELETE /session/{id}
  dispatch(prov, model, prompt, onChunk)     → session + message combinados
```

**Providers conhecidos:**
```
kilo · opencode · openai · github-copilot · kimi-for-coding · zai · bailian-coding-plan
```

---

## 9. Sincronização de Repositórios

Ver `SYNC.md` para detalhes completos.

```
argenta_fenix (workspace)  ←→  argenta-holistic-control (standalone)
  git add sandbox/hmc/           npm run sync:hmc
  git commit + push              (commit + push automático)
```

---

*ARCHITECTURE.md — Documento vivo · Atualizado pelo Protocolo Scribe*
