# Holistic Mission Control

```
 ██╗  ██╗ ██████╗ ██╗     ██╗███████╗████████╗██╗ ██████╗
 ██║  ██║██╔═══██╗██║     ██║██╔════╝╚══██╔══╝██║██╔════╝
 ███████║██║   ██║██║     ██║███████╗   ██║   ██║██║
 ██╔══██║██║   ██║██║     ██║╚════██║   ██║   ██║██║
 ██║  ██║╚██████╔╝███████╗██║███████║   ██║   ██║╚██████╗
 ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝╚══════╝  ╚═╝   ╚═╝ ╚═════╝
  MISSION CONTROL  ·  Argenta Fênix  ·  Hive Edition
```

![Status](https://img.shields.io/badge/status-operational-4ade80?style=flat-square)
![Version](https://img.shields.io/badge/version-1.0.0-60a5fa?style=flat-square)
![Node](https://img.shields.io/badge/node-20%2B-339933?style=flat-square&logo=node.js)
![License](https://img.shields.io/badge/license-private-ef4444?style=flat-square)
![Sprints](https://img.shields.io/badge/sprints-6%2F6%20delivered-f97316?style=flat-square)
![Endpoints](https://img.shields.io/badge/endpoints-21%2B-a78bfa?style=flat-square)
![CLI](https://img.shields.io/badge/CLI-argenta--mc-fbbf24?style=flat-square)

> **Sistema nervoso central de uma colmeia heterogênea de agentes inteligentes.**
> Orquestre, monitore, spawne e converse com agentes de IA — via dashboard web ou CLI de terminal.

---

## Visão Sistêmica

O Mission Control não é um painel de tarefas. É a **infraestrutura operacional** da Argenta Fênix:

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 4 — argenta-CLI / mc commands                             │
│  interface unificada: human ↔ Argenta ↔ hive                   │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3 — Mission Control UI  (porta :3030)                     │
│  Hive Panel · Bulletin Board · Agent Control · Character Chart  │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2 — Hive Bus (Message Bus + Bulletin Board)               │
│  pub/sub topics · posts · threads · replies · WS broadcast     │
├─────────────────────────────────────────────────────────────────┤
│  TIER 1 — Agent Identity Layer                                  │
│  soul · skills · heartbeat · lineage · character chart         │
├─────────────────────────────────────────────────────────────────┤
│  TIER 0 — Substrato                                             │
│  Kilo Code (sessions) · JSONL (events) · JSON (state)          │
└─────────────────────────────────────────────────────────────────┘
```

**Metáfora operacional: colmeia de abelhas**
| Papel | Quem |
|---|---|
| 👑 Rainha | Argenta (orquestradora central) |
| ⚙ Operárias especializadas | Agentes nativos Kilo (code · plan · debug · orchestrator · ask) |
| 🐝 Zangões-missão | Zambias (sub-agentes spawnados com soul + mission específica) |
| 📋 Favo de mel | Bulletin Board (memória coletiva + comunicação assíncrona) |

---

## Features

### Hive Panel
```
┌──────────────────────┐
│   HIVE               │
│                      │
│  ○ The Forge         │  ← agente nativo (code)
│  ● The Oracle        │  ← in_progress
│  ○ The Sleuth        │
│  ○ The Commander     │
│  ○ The Lore Keeper   │
│  ─────────────────   │
│  ● agt-7f3a  Zambia  │  ← zambia ativo
│    ↳ The Forge       │  ← filho de The Forge
│                      │
│  [⚡ Spawn]          │
└──────────────────────┘
```

- Visão em tempo real de todos os agentes (nativos + zambias)
- Árvore de linhagem (parent → filhos indentados)
- Indicadores de status com cores e pontos vivos
- Zombie detection automático (heartbeat > 2min)
- Click no card → Agent Control Panel

### Character Charts (Estilo Diablo II)

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚙  THE FORGE                               [kilo-native]    ║
║  "Implementador Arcano"                ● ACTIVE · execution   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  BASE ATTRIBUTES                                              ║
║  STR ████████████████████░░  88/100  força bruta             ║
║  INT ████████████████░░░░░░  75/100  padrões e arquitetura   ║
║  WIS ████████████░░░░░░░░░░  52/100  julgamento              ║
║  DEX ████████████████████░░  92/100  velocidade ← máximo     ║
║  VIT ████████████████░░░░░░  82/100  resistência             ║
║  CHA ████████░░░░░░░░░░░░░░  48/100  comunicação             ║
║                                                               ║
║  SPECIAL                                                      ║
║  FORGE ████████████████████  100/100  ★ MAXED                ║
║                                                               ║
║  RESISTANCES                                                  ║
║  COMPLEXITY  ████████░░  75%    CONTEXT_LOSS ████████░░  58% ║
║  TOOL_FAIL   █████████░  85%    RATE_LIMIT   ██████░░░░  62% ║
╚═══════════════════════════════════════════════════════════════╝
```

Cada um dos 5 agentes Kilo tem uma ficha completa com:
- Atributos base (STR/INT/WIS/DEX/VIT/CHA)
- Atributo especial exclusivo (FORGE/ORACLE/SLEUTH/COMMAND/LORE)
- Resistências (COMPLEXITY/CONTEXT_LOSS/TOOL_FAIL/RATE_LIMIT)
- Lore, fraqueza, habilidades passivas

### Bulletin Board

```
  ─── BULLETIN BOARD ─────────────────────────────  [+ Post]

  ● msg-3f7a  debug   The Sleuth → broadcast  10/03 14:22
    Hipótese 2 confirmada: falha ocorre quando prediction_input é None.

  ○ msg-2a1c  brainstorm  argenta → broadcast  10/03 13:45
    [BRAINSTORM] Refatoração do pipeline de predição
    ↩ 3 resposta(s)

  ● msg-1b8e  alert   agt-code  → argenta  10/03 13:10
    Bloqueio detectado no módulo de ingestão — rate limit ativo.
```

- Pub/sub assíncrono com 9 tópicos (orchestration · debug · brainstorm · task-result · request-skill · request-agent · heartbeat · memory · alert)
- Posts expansíveis com thread aninhada
- Filtros por tópico, agente, thread
- Compose diretamente no painel
- WS push em tempo real para novos posts

### Agent Control Panel

```
┌─ [AGENT: THE FORGE] ──────────────────────── [✕] ─┐
│ type: native · soul: kilo-native · parent: —        │
│                                                      │
│ Status    [in_progress ▼]   Provider [bailian ▼]   │
│ Model     [MiniMax-M2.5 ▼]  Domain   [execution]   │
│                                                      │
│ Soul      [kilo-native ▼]  [📋 ver] [✏ editar]     │
│                                                      │
│ Skills    [code-review ✓] [test-gen ✓] [+ add]     │
│                                                      │
│ Stats     msgs: 12 · tokens: 4.2k · cost: $0.017   │
│                                                      │
│ [Abrir Chat] [⏹ STOP] [Reatribuir] [Encerrar]      │
└──────────────────────────────────────────────────────┘
```

- Troca de provider/model ao vivo
- Toggle de skills on-demand
- Editor de soul (persona + diretivas)
- Acesso direto ao chat overlay
- Stats em tempo real

### Spawn Modal (Zambias)

Crie sub-agentes especializados com identidade completa:
- Soul (persona + diretivas + restrições)
- Skills injetadas no system prompt
- Missão específica
- Linhagem (parent agent)
- Auto-close ao concluir

### argenta-CLI (`mc`)

Interface de terminal para operação headless completa.

---

## Quick Start

```bash
# Inicia o Mission Control (porta 3030)
npm run ui

# Abre o dashboard no browser
# → http://localhost:3030

# CLI (após `npm link` ou `node cli/mc.mjs`)
mc status
mc agent list
mc chat code
```

---

## CLI Reference

### Visão Geral
```bash
mc status                          # hive overview
mc status --full                   # com stats por agente
```

### Agentes
```bash
mc agent list                      # lista todos os agentes
mc agent show <id>                 # character chart ASCII no terminal
mc agent spawn <soul> <mission>    # spawna Zambia
mc agent stop <id>                 # para sessão do agente
mc agent talk <id> "<mensagem>"    # envia mensagem direta
mc agent skill add <id> <skill>    # adiciona skill on-demand
mc agent skill rm <id> <skill>     # remove skill
mc agent redirect <id> <prov> <m>  # troca provider/model
mc agent close <id>                # encerra agente (marca done)
```

### Bulletin Board
```bash
mc board read                      # últimas 20 mensagens
mc board read --topic debug        # filtrado por tópico
mc board read --thread <thread-id> # conversa específica
mc board post debug "finding: ..."
mc board reply <msg-id> "..."
mc board mark-read <msg-id>
mc board delete <msg-id>
```

### Kanban
```bash
mc task list                       # todas as tasks
mc task list --status in_progress  # filtrado
mc task add "Refatorar pipeline"
mc task move <id> done
mc task show <id>                  # detalhes + histórico
mc task remove <id>
```

### Hive Operations
```bash
mc hive broadcast debug "alerta geral"
mc hive snapshot                   # JSON completo do estado
mc hive snapshot --json            # output raw JSON
mc hive brainstorm "topico"        # abre thread de brainstorm
```

### Chat REPL
```bash
mc chat code                       # abre REPL com The Forge
mc chat plan                       # abre com The Oracle
mc chat <zambia-id>                # abre com qualquer agente

# Dentro do REPL:
#   /sair    → encerra
#   /limpar  → nova sessão
#   /status  → info do agente
#   /help    → comandos
```

---

## Arquitetura do Servidor

```
ui/server.mjs  (Node.js · HTTP nativo · WebSocket RFC 6455 manual)
├── porta 3030
├── serving: ui/index.html
│
├── /api/state              GET
├── /api/health             GET
├── /api/tasks              GET POST
├── /api/tasks/:id          PATCH DELETE
├── /api/events             GET DELETE
├── /api/matrix             GET
├── /api/agents             GET  (Kilo primários)
├── /api/providers          GET  (Kilo providers autenticados)
├── /api/dispatch           POST (fire-and-forget + WS stream)
│
├── /api/chat               POST (envia msg → background + WS push)
├── /api/chat/:key          GET DELETE
├── /api/stop/:key          POST
│
├── /api/hive/agents        GET POST
├── /api/hive/agents/:id    GET PATCH DELETE
├── /api/hive/agents/:id/heartbeat   POST
├── /api/hive/agents/:id/activate    POST
│
├── /api/bus                GET POST
├── /api/bus/:id            PATCH DELETE
├── /api/bus/:id/reply      POST
│
├── /api/skills             GET
├── /api/skills/:name       GET
├── /api/souls              GET
├── /api/souls/:name        GET
├── /api/characters         GET
└── /api/characters/:agent  GET
```

**WebSocket events broadcast:**
```
event           → nova linha do events.jsonl
state           → state update (a cada 3s)
task_added      → nova task no kanban
task_updated    → task movida/alterada
task_removed    → task deletada
dispatch_chunk  → streaming chunk de dispatch
dispatch_done   → dispatch concluído
dispatch_error  → dispatch falhou
chat_user       → mensagem do usuário enviada
chat_thinking   → agente processando
chat_response   → resposta do agente
chat_stopped    → sessão interrompida
chat_error      → erro na sessão
hive_updated    → mudança em agents.json
agent_zombie    → agente detectado como zombie
agent_autoclosed→ zambia com auto_close encerrado
bus_message     → nova mensagem no bus
bus_updated     → mensagem do bus alterada/deletada
```

---

## Agent Identity System

### Skills (9 disponíveis)

| Skill | Domínio | Tokens | Efeito |
|---|---|---|---|
| `deep-trace` | debug | +210 | Análise detalhada de stack traces |
| `log-analysis` | debug | +170 | Parsing e correlação de logs |
| `code-review` | execution | +180 | Revisão estruturada de código |
| `test-gen` | execution | +190 | Geração de testes automatizados |
| `web-search` | research | +150 | Busca web com contexto |
| `scrape` | research | +140 | Extração estruturada de dados web |
| `memory-recall` | research | +130 | Consulta semântica de histórico |
| `explain-plain` | research | +120 | Simplificação de conteúdo técnico |
| `brainstorm` | planning | +160 | Modo divergência criativa |

Cada skill injeta um bloco `[SKILL: NAME]...[/SKILL]` no system prompt da sessão Kilo.

### Souls (4 disponíveis)

| Soul | Perfil | Skills sugeridas |
|---|---|---|
| `kilo-native` | Default. Direto, técnico, orientado a resultado | — |
| `senior-debugger` | Metódico, orientado a evidências, root-cause first | deep-trace · log-analysis · memory-recall |
| `research-analyst` | Analítico, síntese de informação, cita fontes | web-search · memory-recall · explain-plain |
| `creative-architect` | Pensamento sistêmico, design first, divergente | brainstorm · explain-plain · memory-recall |

### The Five Agents

| Agente | Título | Cor | Especial | Força | Fraqueza |
|---|---|---|---|---|---|
| `code` | The Forge | `#4ade80` verde | FORGE 100 | STR 88 / DEX 92 | WIS 52 — foca no presente |
| `plan` | The Oracle | `#60a5fa` azul | ORACLE 100 | INT 97 / WIS 93 | STR 42 — não executa |
| `debug` | The Sleuth | `#f87171` vermelho | SLEUTH 100 | WIS / VIT | CHA baixo — direto ao ponto |
| `orchestrator` | The Commander | `#fbbf24` dourado | COMMAND 100 | CHA / INT | DEX baixo — overhead de coord. |
| `ask` | The Lore Keeper | `#e2e8f0` prata | LORE 100 | INT / CHA | STR mínimo — somente leitura |

---

## Estrutura de Arquivos

```
holistic-mission-control/
│
├── 📄 package.json               # type: module · bin: mc
├── 📄 HIVE_BLUEPRINT.md          # arquitetura completa (v0.1)
│
├── 📁 ui/
│   ├── server.mjs                # HTTP + WebSocket server (1262 linhas)
│   └── index.html                # Dashboard SPA (~3200 linhas)
│
├── 📁 cli/
│   ├── mc.mjs                    # Entry point CLI (argenta-CLI)
│   └── commands/
│       ├── status.mjs            # mc status
│       ├── agent.mjs             # mc agent *
│       ├── board.mjs             # mc board *
│       ├── task.mjs              # mc task *
│       ├── hive.mjs              # mc hive *
│       └── chat.mjs              # mc chat (REPL)
│
├── 📁 expertise-matrix/
│   ├── matrix.yaml               # domain → provider:model routing
│   └── characters/
│       ├── code.yaml             # The Forge — FORGE 100
│       ├── plan.yaml             # The Oracle — ORACLE 100
│       ├── debug.yaml            # The Sleuth — SLEUTH 100
│       ├── orchestrator.yaml     # The Commander — COMMAND 100
│       └── ask.yaml              # The Lore Keeper — LORE 100
│
├── 📁 skills/                    # 9 skills injetáveis
│   ├── deep-trace.yaml
│   ├── web-search.yaml
│   ├── code-review.yaml
│   ├── scrape.yaml
│   ├── explain-plain.yaml
│   ├── brainstorm.yaml
│   ├── memory-recall.yaml
│   ├── log-analysis.yaml
│   └── test-gen.yaml
│
├── 📁 souls/                     # 4 personas/almas
│   ├── kilo-native.yaml
│   ├── senior-debugger.yaml
│   ├── research-analyst.yaml
│   └── creative-architect.yaml
│
├── 📁 hive/
│   ├── agents.json               # registro de todos os agentes
│   └── heartbeats.jsonl          # pulsos periódicos
│
├── 📁 bus/
│   └── messages.jsonl            # barramento de mensagens (append-only)
│
├── 📁 kilo-adapter/
│   ├── adapter.mjs               # HTTP client → kilo serve (:4096)
│   ├── config.json               # base_url, endpoints
│   └── server-manager.mjs        # lifecycle do kilo serve
│
├── 📁 kanban/
│   ├── tasks.json                # store de tasks
│   └── cli.mjs                   # kanban CLI legacy
│
├── 📁 ralph-loop/
│   └── index.mjs                 # Observe→Decide→Dispatch→Verify→Log
│
└── 📁 ops/
    ├── events.jsonl              # log de eventos (imutável)
    ├── state.json                # estado agregado atual
    ├── chat-sessions.json        # sessões de chat persistidas
    └── healthcheck.mjs           # healthcheck standalone
```

---

## Integração Kilo Code

O Mission Control faz bridge entre o dashboard/CLI e o `kilo serve` (porta 4096):

```
kilo-adapter/adapter.mjs
  createSession(providerID, modelID)    → POST /session
  sendMessage(sessionId, ...)           → POST /session/{id}/message
  stopSession(sessionId)                → DELETE /session/{id}
  dispatch(providerID, modelID, prompt) → session + message combinados
```

**Providers suportados:**
```
kilo · opencode · openai · github-copilot · kimi-for-coding · zai · bailian-coding-plan
```

**Session lifecycle com identidade:**
```
POST /api/hive/agents/:id/activate
  → createSession(providerID, modelID) no Kilo
  → loadCharacters() → character chart do agente
  → loadSouls()      → soul YAML do agente
  → loadSkills()     → skills ativos do agente
  → buildAgentContext(char, soul, skills) → system prompt completo
  → armazena em chatSessions Map
  → persiste em ops/chat-sessions.json

POST /api/chat (primeira mensagem)
  → system prompt injetado como prefixo da primeira msg
  → flag firstMsgPrimed = true para não reinjetar
  → sessão Kilo expirada → recria + re-injeta automaticamente
```

---

## Scripts

```bash
npm run ui        # inicia Mission Control UI (porta 3030)
npm run serve     # inicia kilo serve
npm run health    # healthcheck standalone
npm run loop      # inicia ralph-loop (Observe→Decide→Dispatch)
npm run kanban    # CLI do kanban (legado)
npm run mc        # argenta-CLI (alias local)
```

**Instalar CLI globalmente:**
```bash
npm link
mc help
```

**Matar porta 3030 (Windows):**
```powershell
Get-NetTCPConnection -LocalPort 3030 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## Histórico de Sprints

| Sprint | Nome | Status | Entregues |
|---|---|---|---|
| 1 | Character Charts | ✅ Entregue | 5 fichas YAML + endpoint + modal Diablo-style |
| 2 | Agent Identity + Hive Store | ✅ Entregue | CRUD hive, heartbeat, zombie detect, ACP modal |
| 3 | Message Bus + Bulletin Board | ✅ Entregue | bus JSONL + CRUD + WS + BB UI com threads |
| 4 | Skills + Souls | ✅ Entregue | 9 skills + 4 souls + injeção em sessão Kilo |
| 5 | argenta-CLI | ✅ Entregue | mc.mjs + 6 comandos + REPL chat |
| 6 | Zambias + Spawn System | ✅ Entregue | spawn modal + activate endpoint + lineage + auto-close |

---

## Isolamento

- Zero escrita fora de `sandbox/holistic-mission-control/`
- Nenhum toque em arquivos de governança, memória ou identidade da Argenta
- Snapshot obrigatório antes de qualquer mudança estrutural
- Server escuta em `127.0.0.1` apenas (não exposto na rede)

---

## Próximos Passos (Backlog)

| Item | Prioridade | Sprint sugerido |
|---|---|---|
| `hive/memory/` + `GET /api/hive/agents/:id/memory` | Média | 7 |
| `PATCH /api/characters/:agent` (crescimento orgânico de atributos) | Baixa | 7 |
| Qdrant integration (episodic memory embeddings) | Alta | 8 |
| `uptime_ms` tracking em agent stats | Baixa | 7 |
| `mc agent memory <id>` — wiring com endpoint | Baixa | 7 |
| Argenta como orchestrator agent (auto-spawn + auto-close pipeline) | Alta | 8 |

---

*Holistic Mission Control · Argenta Fênix · Adilson Rabelo Jr · 2026*
