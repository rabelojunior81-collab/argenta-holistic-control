# HELP-AI — Mission Control: Contexto Estruturado para Agentes de IA
> Documento token-eficiente. Leia completo antes de agir no sistema.
> Formato: definições compactas + tabelas + fluxos. Sem narrativa redundante.
> Atualizado automaticamente pelo Protocolo Scribe a cada Sprint.
> Última revisão: Sprint 7.3 — 2026-03-07

---

## 0. Identidade do Sistema

**Nome:** Holistic Mission Control (HMC)
**Tipo:** Servidor HTTP+WebSocket Node.js na porta 3030
**Propósito:** Orquestrar uma colmeia de agentes IA, cada um com identidade injetável (character + soul + skills)
**Motor de inferência:** Kilo Code em `localhost:4096`
**Persistência:** JSON/JSONL puro, sem banco de dados externo
**Contexto vivo:** `ARCHITECTURE.md` (mapa técnico), `HIVE_GROWTH_PROTOCOL.md` (metodologia), `CHANGELOG.md` (histórico)

---

## 1. Estrutura de Camadas

```
TIER 4 — CLI:   cli/mc.mjs  →  6 comandos (status·agent·board·task·hive·chat)
TIER 3 — UI:    ui/server.mjs (porta 3030) + ui/index.html (SPA dashboard)
TIER 2 — BUS:   bus/messages.jsonl  (pub/sub assíncrono, 9 tópicos)
TIER 1 — ID:    souls/*.yaml + skills/*.yaml + expertise-matrix/characters/*.yaml
TIER 0 — INFRA: Kilo Code (porta 4096) + ops/events.jsonl + ops/state.json
```

---

## 2. Agentes da Colmeia

### Nativos (permanentes)
| id | chatKey | Nome | Domínio | Soul |
|----|---------|------|---------|------|
| `agt-code-native` | `code` | The Forge | execution | kilo-native |
| `agt-plan-native` | `plan` | The Oracle | planning | kilo-native |
| `agt-debug-native` | `debug` | The Sleuth | investigation | kilo-native |
| `agt-orchestrator-native` | `orchestrator` | The Commander | orchestration | kilo-native |
| `agt-ask-native` | `ask` | The Lore Keeper | knowledge | kilo-native |

### Zambias (temporários)
- Criados via `POST /api/hive/agents` + `POST /api/hive/agents/:id/activate`
- Campo `parent`: id do agente que delegou
- Campo `auto_close: true` + idle 5min → WS `agent_autoclosed` → status `done`

### Status válidos
`idle` | `in_progress` | `blocked` | `zombie` | `done`

Zombie detection: heartbeat ausente por >2min → `zombieCheck()` a cada 30s

---

## 3. API Endpoints (resumo operacional)

**Base:** `http://127.0.0.1:3030/api`

### Agentes
```
GET    /hive/agents              → lista todos
POST   /hive/agents              → registrar {id,name,type,soul,skills,mission,domain,...}
GET    /hive/agents/:id          → detalhes + character + chat data
PATCH  /hive/agents/:id          → atualizar campos
DELETE /hive/agents/:id          → remover
POST   /hive/agents/:id/heartbeat → pulso (append heartbeats.jsonl)
GET    /hive/agents/:id/memory   → {summary, stats, message_count, last_message, qdrant_collection}
POST   /hive/agents/:id/activate → cria sessão Kilo + injeta soul+skills
```

### Chat
```
POST   /chat        → {key, text, providerID?, modelID?} → resposta em WS events
GET    /chat/:key   → histórico {messages:[]}
DELETE /chat/:key   → limpar sessão
POST   /stop/:key   → interromper geração
POST   /dispatch    → fire-and-forget {agent,providerID,modelID,prompt,task_id?}
```

### Kanban
```
GET    /tasks          → array de tasks
POST   /tasks          → {title, description, column?, agent?, chatKey?, ...}
PATCH  /tasks/:id      → {column?, status?, ...}
DELETE /tasks/:id      → remover
```

### Bulletin Board
```
GET    /bus            → ?topic=&from=&thread=&n= → array de messages
POST   /bus            → {topic, from, content, thread?}
PATCH  /bus/:id        → {status?, content?}
DELETE /bus/:id        → remover
POST   /bus/:id/reply  → {from, content}
```

### Identity
```
GET    /skills              → todas as skills
GET    /skills/:name        → skill específica
GET    /souls               → todas as souls
GET    /souls/:name         → soul específica
GET    /characters          → todas as fichas
GET    /characters/:agent   → ficha específica
PATCH  /characters/:agent   → {attributes?, resistances?, special?} → crescimento orgânico
```

### Sistema
```
GET    /state    → ops/state.json + kilo_serve health
GET    /health   → health check completo
GET    /events   → ?n= últimas linhas de events.jsonl
DELETE /events   → {ts} remove evento por timestamp
GET    /agents   → agentes primários Kilo
GET    /providers → providers autenticados
GET    /matrix   → expertise-matrix/matrix.yaml parseado
```

---

## 4. WebSocket Events

Conectar em `ws://localhost:3030`. Todos os eventos chegam como JSON: `{type, payload}`.

| type | quando | payload relevante |
|------|--------|-------------------|
| `event` | nova linha em events.jsonl | objeto do evento |
| `state` | a cada 3s | state + kilo_serve |
| `task_added` | POST /tasks | task |
| `task_updated` | PATCH /tasks/:id | task |
| `task_removed` | DELETE /tasks/:id | {id} |
| `dispatch_chunk` | streaming | {task_id, chunk} |
| `dispatch_done` | concluído | {task_id, result, latency_ms} |
| `dispatch_error` | falhou | {task_id, error} |
| `chat_user` | msg enviada | {chatKey, role, text, ts} |
| `chat_thinking` | processando | {chatKey} |
| `chat_response` | resposta | {chatKey, text, latency_ms, ts} |
| `chat_stopped` | interrompido | {chatKey, kiloCancelled} |
| `chat_error` | erro | {chatKey, error} |
| `hive_updated` | mudança em agents.json | {} |
| `agent_zombie` | heartbeat >2min | {id, name} |
| `agent_autoclosed` | auto_close + idle 5min | {id, name} |
| `bus_message` | novo post | msg completo |
| `bus_updated` | PATCH/DELETE | {id, deleted?} |
| `character_updated` | PATCH /characters/:agent | {agent} |

---

## 5. Injeção de Identidade

Fluxo executado em `POST /api/hive/agents/:id/activate` ou na primeira mensagem de chat:

```
loadCharacters() + loadSouls() + loadSkills()
  ↓
buildAgentContext(char, agentName, soul, skillObjs)
  → [MISSION CONTROL — CONTEXTO DO SISTEMA]
  → [SUA IDENTIDADE] (nome + domínio + character attrs)
  → [LORE / PROPÓSITO]
  → [FRAQUEZA CONHECIDA]
  → [ALMA / PERSONA] (soul.persona + directives + restrictions + tone)
  → [SKILLS ATIVAS] (skill.inject para cada skill ativa)
  → [DIRECTIVA OPERACIONAL]
  ↓
chat.systemCtx = contexto completo
primeira mensagem ao Kilo = systemCtx + userMessage
```

Sessão expirada: flag `restored = true` → recria sessão Kilo + re-injeta systemCtx automaticamente.

---

## 6. Estrutura de Arquivos de Identidade

### Soul YAML (`souls/<name>.yaml`)
```yaml
name: kilo-native
display: "Kilo Native"
description: "..."
persona: >
  texto livre da persona
directives:
  - diretiva 1
restrictions:
  - restrição 1
tone: direto, técnico, sem floreio
```

### Skill YAML (`skills/<name>.yaml`)
```yaml
name: code-review
display: "Code Review"
description: "..."
inject: >
  bloco de prompt injetado no contexto do agente
```

### Character YAML (`expertise-matrix/characters/<agent>.yaml`)
```yaml
name: "The Forge"
class: "Code Executor"
level: 1
attributes:
  STR: 95
  INT: 80
  WIS: 60
  DEX: 90
  VIT: 70
  CHA: 40
resistances:
  COMPLEXITY: 88
  CONTEXT_LOSS: 55
  TOOL_FAIL: 75
  RATE_LIMIT: 60
special:
  FORGE: 100
lore: "..."
weakness: "..."
```

---

## 7. Persistência

| Arquivo | Formato | Mutação |
|---------|---------|---------|
| `kanban/tasks.json` | JSON array | read-write completo |
| `ops/events.jsonl` | JSONL append-only | append (delete por ts) |
| `ops/state.json` | JSON | write por Ralph Loop |
| `ops/chat-sessions.json` | JSON map | write a cada msg |
| `hive/agents.json` | JSON array | read-write completo |
| `hive/heartbeats.jsonl` | JSONL append-only | append only |
| `hive/memory/*.md` | Markdown | write por agente ao encerrar |
| `bus/messages.jsonl` | JSONL | append (PATCH reescreve tudo) |
| `expertise-matrix/characters/*.yaml` | YAML | write por PATCH /characters |

---

## 8. Tópicos do Bulletin Board

```
orchestration | debug | brainstorm | alert | report
request | feedback | coordination | general
```

Formato de post: `{id, topic, from, content, ts, status, replies[]}`

---

## 9. CLI Reference (mc)

```bash
mc status [--full]
mc agent list|show|spawn|stop|talk|skill|redirect|close|memory
mc board read|post|reply|mark-read|delete
mc task list|add|move|remove|show
mc hive broadcast|snapshot|brainstorm
mc chat <id>   # REPL interativo com histórico, /sair, /limpar, /status
```

API base: `http://127.0.0.1:3030/api` (override: `--url` ou `MC_URL`)

---

## 10. Padrões de Integração

### Como um agente deve reportar bloqueio
```
POST /api/bus
{ "topic": "alert", "from": "<agent_id>", "content": "Bloqueio: <descrição>" }
```

### Como um agente deve sinalizar conclusão
```
PATCH /api/hive/agents/<id>
{ "status": "idle", "mission": null }
POST /api/bus
{ "topic": "report", "from": "<agent_id>", "content": "Concluído: <resumo>" }
```

### Como criar e ativar um zambia
```
POST /api/hive/agents
{ "name": "PR Reviewer", "type": "zambia", "parent": "agt-orchestrator-native",
  "soul": "kilo-native", "skills": ["code-review"], "mission": "...",
  "domain": "review", "auto_close": true }
→ { "id": "agt-<uuid>" }

POST /api/hive/agents/agt-<uuid>/activate
→ { "activated": true, "chatKey": "agt-<uuid>", "sessionId": "..." }
```

### Como ler memória de um agente
```
GET /api/hive/agents/<id>/memory
→ { agent_id, name, summary_file, summary_exists, summary,
    message_count, last_message, stats, qdrant_collection }
```

---

## 11. Providers e Modelos

Providers autenticados (via Kilo):
```
kilo | opencode | openai | github-copilot | kimi-for-coding | zai | bailian-coding-plan
```

Verificar providers disponíveis: `GET /api/providers`
Verificar agentes Kilo: `GET /api/agents`

Cada agente nativo tem `providerID` e `modelID` configurados em `hive/agents.json`.

---

## 12. Loops Internos do Servidor

| Função | Intervalo | Ação |
|--------|-----------|------|
| `pollEvents()` | 1.5s | tail de events.jsonl → WS broadcast `event` |
| `broadcastState()` | 3s | state + kilo health → WS broadcast `state` |
| `zombieCheck()` | 30s | heartbeat >2min → status `zombie` + WS `agent_zombie` |
| `syncNativeAgentStatus()` | 5s | sync status nativos com chatSessions + auto-close zambias |

---

## 13. Protocolo Scribe — Atualização desta Documentação

Esta documentação é atualizada automaticamente ao final de cada sub-sprint entregue.

**Regra:** ao entregar qualquer sub-sprint, o Scribe DEVE:
1. APPEND ao `CHANGELOG.md` (nunca editar entradas anteriores)
2. EVOLVE `ARCHITECTURE.md` (adicionar/atualizar seções afetadas)
3. EVOLVE `HELP-HUMAN.md` + `HELP-AI.md` (atualizar tabelas, flows, exemplos)
4. MARK checklist em `HIVE_GROWTH_PROTOCOL.md` ([x] + data)

**Modo de crescimento semântico:**
- Novo endpoint → adicionar à tabela §3
- Novo WS event → adicionar à tabela §4
- Novo arquivo de persistência → adicionar à tabela §7
- Novo tópico de bus → adicionar à lista §8
- Mudança no fluxo de injeção → atualizar §5
- Novo padrão de integração → adicionar a §10

---

*HELP-AI.md — Documento injetável · Atualizado pelo Protocolo Scribe*
