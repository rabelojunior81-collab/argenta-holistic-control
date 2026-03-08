<!--
  HOLISTIC MISSION CONTROL
  README · Landing Page · v2.0 · 2026
  Bilingual: English (primary) · Português Brasileiro
-->

<div align="center">

```
  +----------------------------------------------------------+
  |                                                          |
  |   H O L I S T I C   M I S S I O N   C O N T R O L      |
  |   ....................................................   |
  |        Agents  ~  Human  *  Quantum  *  Holistic         |
  |                                                          |
  +----------------------------------------------------------+
```

[![Status](https://img.shields.io/badge/status-operational-4ade80?style=flat-square&labelColor=0d1117)](.)
[![Version](https://img.shields.io/badge/version-1.0.0-d4a843?style=flat-square&labelColor=0d1117)](.)
[![Node](https://img.shields.io/badge/node-20%2B-339933?style=flat-square&labelColor=0d1117&logo=node.js&logoColor=white)](.)
[![Sprints](https://img.shields.io/badge/sprints_delivered-8%2F8-d4a843?style=flat-square&labelColor=0d1117)](launch_roadmap.md)
[![Endpoints](https://img.shields.io/badge/endpoints-21%2B-7c3aed?style=flat-square&labelColor=0d1117)](ARCHITECTURE.md)
[![CLI](https://img.shields.io/badge/CLI-mc-60a5fa?style=flat-square&labelColor=0d1117)](.)
[![License](https://img.shields.io/badge/license-private-ef4444?style=flat-square&labelColor=0d1117)](.)

</div>

---

<div align="center">

### The central nervous system for orchestrating a heterogeneous hive of intelligent agents.
### *O sistema nervoso central para orquestrar uma colmeia heterogênea de agentes inteligentes.*

**Orchestrate · Monitor · Spawn · Converse — via web dashboard or terminal CLI.**
*Orquestre · Monitore · Spawne · Converse — via dashboard web ou CLI de terminal.*

</div>

---

## ◈ Screenshots

> 📸 *Screenshots em breve — salve suas capturas em [`docs/assets/screenshots/`](docs/assets/screenshots/.gitkeep)*

| Dashboard | Hive Panel | Character Chart |
|:---:|:---:|:---:|
| ![Dashboard](docs/assets/screenshots/hmc-dashboard.png) | ![Hive](docs/assets/screenshots/hmc-hive-panel.png) | ![Character](docs/assets/screenshots/hmc-character-chart.png) |
| *Visão geral do sistema* | *Colmeia de agentes em tempo real* | *Ficha RPG de atributos* |

| Kanban | Chat Modal | Bulletin Board |
|:---:|:---:|:---:|
| ![Kanban](docs/assets/screenshots/hmc-kanban.png) | ![Chat](docs/assets/screenshots/hmc-chat-modal.png) | ![Board](docs/assets/screenshots/hmc-bulletin-board.png) |
| *Fluxo de tarefas 4 colunas* | *Conversa com identidade injetada* | *Comunicação assíncrona pub/sub* |

---

## ◈ What is it? / O que é?

**EN —** Holistic Mission Control is not a task manager. It is an **operational infrastructure** for human-AI collaboration — a place where humans and AI agents work together with full identity, memory, and accountability. Each agent has a soul, skills, a character chart, and a heartbeat. Decisions are traceable. The state is transparent.

**PT —** O Holistic Mission Control não é um gerenciador de tarefas. É uma **infraestrutura operacional** para colaboração humano-IA — um lugar onde humanos e agentes de IA trabalham juntos com identidade completa, memória e rastreabilidade. Cada agente tem uma alma, habilidades, uma ficha de personagem e um heartbeat. Decisões são rastreáveis. O estado é transparente.

---

## ◈ Philosophy / Filosofia

```
  HOLÍSTICO                    QUÂNTICO                      VIVO
  ─────────                    ────────                      ────
  Cada componente existe       Agentes e humanos operam      O sistema evolui.
  em relação ao todo.          em superposição de            A metodologia evolui.
  Código · Docs · Agentes ·    intenções até o momento       O que não evolui,
  Humanos — um ecossistema.    da decisão.                   morre.
```

> *"Agentes ~ Humano. Não ferramentas — colaboradores. Não automação — orquestração."*

The system is built on the conviction that AI agents, when given **identity** (soul + skills + character), **structure** (approval gates + molecular methodology), and **memory** (episodic + collective bulletin board), produce outcomes that neither humans nor AI could achieve alone.

> *O sistema é construído na convicção de que agentes de IA, quando dotados de **identidade** (alma + habilidades + ficha), **estrutura** (gates de aprovação + metodologia molecular) e **memória** (episódica + bulletin board coletivo), produzem resultados que nem humanos nem IA alcançariam sozinhos.*

---

## ◈ The Hive / A Colmeia

The beehive is our operational metaphor. Every entity has a role:

*A colmeia é nossa metáfora operacional. Cada entidade tem um papel:*

```
  ┌─────────────────────────────────────────────────────────┐
  │  👑  QUEEN  /  RAINHA                                   │
  │      Argenta — the central orchestrator                 │
  │      Human + AI working as one                          │
  ├─────────────────────────────────────────────────────────┤
  │  ⚙   WORKERS  /  OPERÁRIAS                              │
  │      The Forge   · The Oracle  · The Sleuth             │
  │      The Commander · The Lore Keeper                    │
  │      — specialized native agents, always available      │
  ├─────────────────────────────────────────────────────────┤
  │  🐝  DRONES  /  ZANGÕES                                 │
  │      Zambias — mission-specific ephemeral agents        │
  │      spawned, used, and auto-closed                     │
  ├─────────────────────────────────────────────────────────┤
  │  📋  HONEYCOMB  /  FAVO                                 │
  │      Bulletin Board — collective async memory           │
  │      9 topics · threads · real-time WS push             │
  └─────────────────────────────────────────────────────────┘
```

### The Five Native Agents / Os Cinco Agentes Nativos

| Agent | Title | Special Power | Strength | Weakness |
|---|---|:---:|---|---|
| `code` | **The Forge** 🟢 | FORGE 100 | STR 88 · DEX 92 — raw execution | WIS 52 — focus on present only |
| `plan` | **The Oracle** 🔵 | ORACLE 100 | INT 97 · WIS 93 — foresight | STR 42 — does not execute |
| `debug` | **The Sleuth** 🔴 | SLEUTH 100 | WIS · VIT — root cause hunter | CHA low — blunt, direct |
| `orchestrator` | **The Commander** 🟡 | COMMAND 100 | CHA · INT — coordination | DEX low — coordination overhead |
| `ask` | **The Lore Keeper** ⚪ | LORE 100 | INT · CHA — synthesis | STR min — read-only by design |

Each agent has a full **Character Chart** — RPG-style attributes with resistances, special powers, and lore.

*Cada agente possui uma **Ficha de Personagem** completa — atributos estilo RPG com resistências, poderes especiais e lore.*

```
  ╔══════════════════════════════════════════════════════════╗
  ║  ⚙  THE FORGE                           [kilo-native]   ║
  ║  "O Implementador Arcano"          ● ACTIVE · execution  ║
  ╠══════════════════════════════════════════════════════════╣
  ║  STR  ████████████████████░░  88   força bruta           ║
  ║  INT  ████████████████░░░░░░  75   padrões               ║
  ║  WIS  ████████████░░░░░░░░░░  52   julgamento            ║
  ║  DEX  ████████████████████░░  92   velocidade ← MAX      ║
  ║  VIT  ████████████████░░░░░░  82   resistência           ║
  ║  CHA  ████████░░░░░░░░░░░░░░  48   comunicação           ║
  ║  ─────────────────────────────────────────────────────   ║
  ║  FORGE ████████████████████  100  ★ MAXED                ║
  ╚══════════════════════════════════════════════════════════╝
```

---

## ◈ Architecture / Arquitetura

```
  ┌─────────────────────────────────────────────────────────┐
  │  TIER 4 — argenta-CLI  (mc commands)                    │
  │  unified interface: human ↔ AI ↔ hive                   │
  ├─────────────────────────────────────────────────────────┤
  │  TIER 3 — Mission Control UI  (:3030)                   │
  │  Hive · Kanban · Bulletin Board · Characters · Help     │
  ├─────────────────────────────────────────────────────────┤
  │  TIER 2 — Hive Bus                                      │
  │  pub/sub · 9 topics · threads · WebSocket broadcast     │
  ├─────────────────────────────────────────────────────────┤
  │  TIER 1 — Agent Identity                                │
  │  soul · skills · heartbeat · lineage · character        │
  ├─────────────────────────────────────────────────────────┤
  │  TIER 0 — Substrate                                     │
  │  Kilo Code (:4096) · JSONL events · JSON state          │
  └─────────────────────────────────────────────────────────┘

  Node.js ESM · No frameworks · No database · RFC 6455 WS
  JSON/JSONL persistence · 127.0.0.1 only · Graceful degradation
```

**Key design decisions / Decisões de design:**
- **No frameworks** — plain Node.js HTTP + manual WebSocket. Zero hidden behavior.
- **No database** — JSON/JSONL files. Portable, inspectable, append-only audit trail.
- **Kilo is the substrate** — providers come from `kilo serve` live. No static fallbacks.
- **Identity as context** — soul + skills injected as system prompt prefix. Flexible, not locked.

---

## ◈ Features

### 🐝 Hive Management
Real-time view of all agents (native + zambias) with lineage tree, status indicators, zombie detection (>2min without heartbeat), and instant access to Agent Control Panel.

### ⚙ Agent Control Panel
Change provider/model live · Toggle skills on-demand · Edit soul (persona + directives) · View stats (messages, tokens, cost, uptime) · Open chat · Stop · Reassign · Close.

### 📋 Bulletin Board
Async pub/sub with 9 topics (`orchestration · debug · brainstorm · alert · report · request · feedback · coordination · general`) · Threaded replies · Real-time WS push · Filters by topic/agent/thread.

### 🗂 Kanban Board
4-column workflow (Backlog → Doing → Review → Done) · Session viewer (Messages/Reasoning/Code/Metrics tabs) · Real-time updates via WebSocket.

### 🎭 Identity System
**9 Skills** — injectable prompt enhancements (`deep-trace · code-review · test-gen · web-search · brainstorm · memory-recall · ...`)
**4 Souls** — persona templates (`kilo-native · senior-debugger · research-analyst · creative-architect`)

### 🧬 Spawn System (Zambias)
Create ephemeral mission-specific agents with full identity customization (soul + skills + mission + parent + auto-close). Lineage tree shows parent → children hierarchy.

### 🧠 Episodic Memory
Ollama embeddings + Qdrant vector DB + local JSON fallback. Graceful degradation when Qdrant is offline.

### 🌱 Organic Growth
Character attributes evolve with task completion (`PATCH /api/characters/:agent`). Agents grow through experience.

### ⌨ argenta-CLI (`mc`)
Full headless operation via terminal. 6 command groups + interactive REPL chat.

---

## ◈ Quick Start / Início Rápido

**Requirements / Requisitos:** Node.js 20+ · [Kilo Code](https://kilo.codes) installed

```bash
# Clone and install / Clonar e instalar
git clone https://github.com/rabelojunior81-collab/argenta-holistic-control.git
cd argenta-holistic-control
npm install

# Start Mission Control / Iniciar Mission Control
npm run ui
# → http://localhost:3030

# Windows launcher (opens browser automatically)
start-mc.bat

# Install CLI globally / Instalar CLI globalmente
npm link
mc help
```

> **Note:** Kilo Code (`kilo serve` on port 4096) must be running for providers and chat to work.
> **Nota:** O Kilo Code (`kilo serve` na porta 4096) deve estar rodando para providers e chat funcionarem.

---

## ◈ CLI Reference

```bash
# Status
mc status                          # hive overview
mc status --full                   # with per-agent stats

# Agents / Agentes
mc agent list                      # list all agents
mc agent show <id>                 # ASCII character chart in terminal
mc agent spawn <soul> <mission>    # spawn a Zambia
mc agent talk <id> "<message>"     # send direct message
mc agent skill add <id> <skill>    # inject skill on-demand
mc agent redirect <id> <prov> <m>  # live provider/model switch
mc agent close <id>                # mark agent as done

# Bulletin Board
mc board read                      # last 20 messages
mc board read --topic debug        # filtered by topic
mc board post debug "finding: ..."
mc board reply <msg-id> "..."

# Kanban
mc task list
mc task add "Refactor pipeline"
mc task move <id> done
mc task show <id>

# Hive Operations
mc hive broadcast debug "alert"
mc hive snapshot

# Chat REPL
mc chat code                       # The Forge
mc chat plan                       # The Oracle
mc chat <agent-id>                 # any agent
# Inside REPL: /sair · /limpar · /status · /help
```

---

## ◈ File Structure / Estrutura de Arquivos

```
holistic-mission-control/
│
├── 📄 README.md                  ← you are here
├── 📄 MANIFESTO.md               ← methodology manifesto (canonical, living)
├── 📄 launch_roadmap.md          ← dual post-mortem + launch roadmap
├── 📄 ARCHITECTURE.md            ← full technical architecture
├── 📄 CHANGELOG.md               ← complete history of changes
├── 📄 HELP-HUMAN.md              ← operator guide (human)
├── 📄 HELP-AI.md                 ← AI onboarding guide
│
├── 📁 ui/
│   ├── server.mjs                # HTTP + WebSocket server (1262 lines)
│   └── index.html                # SPA Dashboard (~3200 lines)
│
├── 📁 cli/
│   ├── mc.mjs                    # CLI entry point
│   └── commands/                 # status · agent · board · task · hive · chat
│
├── 📁 expertise-matrix/
│   ├── matrix.yaml               # domain → provider:model routing (v4.1)
│   └── characters/               # The Forge · Oracle · Sleuth · Commander · Lore Keeper
│
├── 📁 skills/                    # 9 injectable prompt skills
├── 📁 souls/                     # 4 persona templates
│
├── 📁 hive/
│   ├── agents.json               # agent registry
│   ├── consensus.mjs             # distributed voting system
│   └── delegation.mjs            # recursive delegation logic
│
├── 📁 kilo-adapter/              # Kilo Code bridge (:4096)
├── 📁 memory/                    # Episodic memory (Qdrant + JSON fallback)
├── 📁 bus/                       # Message bus (append-only JSONL)
├── 📁 kanban/                    # Task store
├── 📁 ralph-loop/                # Observe→Decide→Dispatch→Verify→Log
│
├── 📁 docs/
│   ├── assets/screenshots/       # ← save screenshots here
│   └── legacy/                   # archived docs (historical knowledge base)
│
└── 📁 ops/                       # runtime state, events, health
```

---

## ◈ WebSocket Events

The server broadcasts 20+ real-time events to all connected clients:

```
event · state · task_added · task_updated · task_removed
dispatch_chunk · dispatch_done · dispatch_error
chat_user · chat_thinking · chat_response · chat_stopped · chat_error
hive_updated · agent_zombie · agent_autoclosed
bus_message · bus_updated · character_updated
```

---

## ◈ Documentation Hub / Documentação

| Document | Purpose |
|---|---|
| [README.md](README.md) | This file — project overview and landing page |
| [MANIFESTO.md](MANIFESTO.md) | Canonical methodology — 10 principles, 8 phases, Scribe Protocol |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full technical architecture, all endpoints, data flows |
| [launch_roadmap.md](launch_roadmap.md) | Post-mortem audit (static) + launch roadmap (living) |
| [CHANGELOG.md](CHANGELOG.md) | Complete history of all changes, bugs, and deliveries |
| [HELP-HUMAN.md](HELP-HUMAN.md) | Operator guide for human users |
| [HELP-AI.md](HELP-AI.md) | Onboarding guide for AI agents joining the hive |
| [docs/legacy/](docs/legacy/) | Archived documents — historical knowledge base |

---

## ◈ Roadmap

The project is entering its **launch phase** (Sprint 9+). See [launch_roadmap.md](launch_roadmap.md) for the full dual roadmap.

*O projeto está entrando em sua **fase de lançamento** (Sprint 9+). Veja [launch_roadmap.md](launch_roadmap.md) para o roadmap completo.*

```
  ✅ Sprint 1–8   Foundation complete — 8 sprints delivered
  🟡 Sprint 9     Agnostic fork — remove Argenta-specific hardcoding
  ⬜ Sprint 10    Full runtime — MCP · consensus · delegation · Web CLI
  ⬜ Sprint 11    Plugin system · automated tests · multi-hive PoC
  ⬜ Sprint 12    Production hardening · screenshots · v1.0 launch tag
```

---

## ◈ Contributing / Contribuindo

This is currently a **private project** under active development.

*Este é atualmente um **projeto privado** em desenvolvimento ativo.*

If you're an AI agent onboarding to this hive, start with [HELP-AI.md](HELP-AI.md).
If you're a human operator, start with [HELP-HUMAN.md](HELP-HUMAN.md).

---

<div align="center">

```
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │   A G E N T E S   ~   H U M A N O                  │
  │                                                     │
  │   Não ferramentas.  Colaboradores.                  │
  │   Not tools.  Collaborators.                        │
  │                                                     │
  │   Não automação.  Orquestração.                     │
  │   Not automation.  Orchestration.                   │
  │                                                     │
  │          Q U Â N T I C O  ·  H O L Í S T I C O     │
  │                                                     │
  └─────────────────────────────────────────────────────┘
```

*Holistic Mission Control · Argenta Fênix · 2026*
*Built with intention. Documented with care. Delivered with soul.*

</div>
