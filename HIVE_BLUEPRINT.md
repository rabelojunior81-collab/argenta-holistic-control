# HIVE BLUEPRINT — Mission Control / Argenta Fênix
> Versão 0.1 — 2026-03-05
> Arquitetura completa da colmeia de agentes inteligentes

---

## 0. Visão Sistêmica

O Mission Control não é um painel de tarefas. É um **sistema nervoso central** para uma
colmeia heterogênea de agentes inteligentes que:

- Possuem identidade, alma, memória e habilidades próprias
- Se comunicam através de um barramento de mensagens compartilhado
- Podem ser orquestrados por humanos (Adilson) ou pela Argenta via UI ou CLI
- Operam sobre o substrato do Kilo Code (sessões síncronas) com camada de estado persistida

**Metáfora operacional:** abelhas numa colmeia.
- **Rainha:** Argenta (orquestradora central)
- **Operárias especializadas:** Pre-defined Kilo agents (code, plan, debug, orchestrator, ask)
- **Zangões-missão:** Zambias (sub-agentes spawnados com soul + mission)
- **Mensageiras:** Task-agents (workers descartáveis, reportam e morrem)
- **Favo de mel:** Bulletin Board (memória coletiva + comunicação assíncrona)

---

## 1. Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 4 — argenta-CLI / mc commands                             │
│  interface unificada: human ↔ Argenta ↔ hive                   │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3 — Mission Control UI                                    │
│  Hive Panel · Bulletin Board · Agent Control · Character Chart  │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2 — hive-bus (Message Bus + Bulletin Board)               │
│  pub/sub topics · mural de posts · threads · eventos           │
├─────────────────────────────────────────────────────────────────┤
│  TIER 1 — Agent Identity Layer                                  │
│  soul · skills · memory · heartbeat · identity · lineage       │
├─────────────────────────────────────────────────────────────────┤
│  TIER 0 — Substrato                                             │
│  Kilo Code (sessions) · Qdrant (embeddings) · JSONL (eventos)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1 — Agent Identity Layer

### 2.1 Schema de Agente

Cada agente ativo no hive tem um registro em `hive/agents.json`:

```json
{
  "id":          "agt-a1b2c3d4",
  "name":        "Debugger Prime",
  "type":        "zambia",
  "parent":      "agt-orchestrator-native",
  "creator":     "argenta",
  "born":        "2026-03-05T10:00:00Z",
  "status":      "in_progress",
  "heartbeat":   "2026-03-05T10:05:42Z",
  "soul":        "souls/senior-debugger.yaml",
  "skills":      ["deep-trace","log-analysis","stack-unwind","explain-plain"],
  "mission":     "Find null deref in seldon prediction pipeline",
  "domain":      "debug",
  "providerID":  "kimi-for-coding",
  "modelID":     "kimi-k2-thinking",
  "chatKey":     "agt-a1b2c3d4",
  "sessionId":   "ses_xyz123",
  "taskId":      "kanban-task-id",
  "memory": {
    "qdrant_collection": "agent-a1b2c3d4",
    "summary_file":      "hive/memory/agt-a1b2c3d4.md"
  },
  "stats": {
    "messages_sent":   12,
    "tokens_used":     8420,
    "cost_usd":        0.034,
    "uptime_ms":       342000
  }
}
```

### 2.2 Soul (Alma)

Arquivo YAML que define personalidade, diretivas e restrições:

```yaml
# souls/senior-debugger.yaml
name: Senior Debugger
persona: >
  Você é um engenheiro sênior especializado em análise de falhas.
  Você é metódico, curioso e não assume nada sem evidência.
  Você pensa em voz alta, documenta cada passo e explica causas-raiz.
directives:
  - Sempre reproduza o bug antes de analisar
  - Documente cada hipótese explicitamente
  - Use ferramentas de leitura antes de sugerir correção
  - Reporte descobertas parciais no bulletin board (topic: debug)
restrictions:
  - Não modifique código sem aprovação explícita
  - Não assuma que um erro é óbvio sem verificar
tone: analítico, preciso, sem floreio
```

### 2.3 Skills (Habilidades On-Demand)

Skills são fragmentos de prompt injetados na sessão quando ativados:

```
skills/
  deep-trace.yaml        → análise de stack traces detalhada
  web-search.yaml        → uso de busca web com contexto
  code-review.yaml       → revisão estruturada de código
  scrape.yaml            → extração estruturada de dados web
  explain-plain.yaml     → tradução de técnico para simples
  brainstorm.yaml        → modo elucubração / divergência criativa
  memory-recall.yaml     → consulta ao Qdrant antes de responder
  log-analysis.yaml      → parsing e correlação de logs
  test-gen.yaml          → geração de testes automatizados
```

Cada skill tem:
```yaml
name: deep-trace
inject: |
  Ao analisar um erro, sempre:
  1. Identifique o frame de origem real (não o wrapper)
  2. Liste todas as variáveis relevantes no escopo
  3. Trace o caminho de execução desde a entrada
  4. Proponha hipóteses rankeadas por probabilidade
tokens_overhead: ~200
```

### 2.4 Memory

Dois níveis:
- **Episódica (Qdrant):** embeddings de cada mensagem da sessão → busca semântica
- **Sumário (Markdown):** `hive/memory/agt-{id}.md` — escrito pelo agente ao encerrar

### 2.5 Heartbeat

Pulso periódico (~30s) gravado em `hive/heartbeats.jsonl`:
```json
{"ts":"2026-03-05T10:05:42Z","agent_id":"agt-a1b2c3d4","status":"in_progress","active":true,"queue_depth":2}
```

O hive-bus detecta agentes mortos (heartbeat > 2min) e marca como `zombie`.

---

## 3. Tier 2 — Hive Bus (Barramento + Mural)

### 3.1 Message Bus (pub/sub)

Arquivo `hive/bus.jsonl` — cada linha é uma mensagem:

```json
{
  "id":       "msg-uuid",
  "ts":       "2026-03-05T10:03:00Z",
  "from":     "agt-a1b2c3d4",
  "to":       "broadcast",
  "topic":    "debug",
  "subtype":  "finding",
  "thread":   "thread-seldon-nullderef",
  "content":  "Hipótese 2 confirmada: o pipeline falha quando prediction_input é None.",
  "status":   "new",
  "attachments": [],
  "replies":  []
}
```

**Topics padrão:**
| Topic | Uso |
|---|---|
| `orchestration` | Comandos e status da orquestradora |
| `debug` | Findings, hipóteses, stack traces |
| `brainstorm` | Elucubrações, ideias, divergência criativa |
| `task-result` | Resultados de task-agents |
| `request-skill` | Agente pede skill que não tem |
| `request-agent` | Pedido de spawn de Zambia |
| `heartbeat` | Pulsos periódicos (filtrado por padrão no UI) |
| `memory` | Agentes compartilhando contexto/conhecimento |
| `alert` | Erros críticos, bloqueios, dependências |

### 3.2 Bulletin Board (Mural)

Vista UI do bus — filtrável por topic, agente, thread, status.
Cada post é um card expansível com:
- Header: from · topic · ts · thread
- Body: conteúdo (markdown renderizado)
- Actions: Reply · Mark Read · Archive · Pin
- Thread view: conversação aninhada entre agentes

**Diferença bus vs mural:** o bus é o stream bruto (toda mensagem passa por ele); o mural é a vista curada (filtrada, organizada por thread, com UI de interação).

---

## 4. Tier 3 — Mission Control UI (Evolução)

### 4.1 Painéis

```
┌──────────────┬──────────────────────────────────┬──────────────────┐
│  HIVE PANEL  │         CENTRO                   │  BULLETIN BOARD  │
│              │  [Kanban] [Character Chart]       │                  │
│  • code      │                                  │  topic: debug    │
│  ● plan      │  [Modal controle agente]         │  ○ finding...    │
│  ○ debug     │  [Modal spawn zambia]            │  ○ hipótese...   │
│  ● orchestr. │  [Modal soul editor]             │                  │
│  ○ ask       │                                  │  [+ Post]        │
│  ─────       │                                  │  [Filter]        │
│  Zambias     │                                  │                  │
│  ● agt-a1b2  │                                  │                  │
└──────────────┴──────────────────────────────────┴──────────────────┘
                      [SWITCHBOARD / CLI bar]
```

### 4.2 Agent Control Panel (Modal)

Para cada agente (click no card do hive panel ou kanban):

```
┌─ [AGENT: PLAN] ─────────────────────────────────────── [✕] ─┐
│ Identity                                                       │
│   type: pre-defined · soul: kilo-native · lineage: root       │
│                                                                │
│ Status    [in_progress ▼]   Priority [high ▼]                │
│                                                                │
│ Provider  [Kimi For Coding ▼]  Model  [kimi-k2-thinking ▼]   │
│ Domain    [planning ▼]                                         │
│                                                                │
│ Skills    [+ Adicionar skill]                                  │
│   ✓ brainstorm   ✓ memory-recall   ○ web-search               │
│                                                                │
│ Stats     tokens: 8.4k · cost: $0.034 · uptime: 5m42s        │
│                                                                │
│ Last activity: "Analisei o escopo do módulo X..."             │
│                                                                │
│ [Abrir Chat] [⏹ STOP] [🧠 Ver Memória] [📋 Ver Soul]         │
│ [Reatribuir] [Encerrar Sessão]                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Tier 3 — Character Chart (Painel de Fatoração Holística)

### 5.1 Conceito

Extensão do `expertise-matrix/matrix.yaml` — cada agente Kilo pré-definido tem uma
**ficha de personagem** ao estilo Diablo II, com atributos "pixelizados" que representam
suas capacidades, especialidades e modo de operação.

**Estética visual:**
- Fundo escuro com textura de pedra/grade pixelizada
- Atributos em fontes mono com barras de stat estilo RPG
- Ícones pixelizados por categoria
- Cor temática por agente (code=verde, plan=azul, debug=vermelho, orchestrator=dourado, ask=prata)

### 5.2 Atributos por Agente

Cada atributo vai de 0–100 e é computado a partir do comportamento real (tokens usados,
tipos de tasks concluídas, domínios ativos, etc.). Inicialmente definidos no YAML.

**Atributos base (todos os agentes):**
```
STR  Strength      → capacidade de execução bruta (tools, edições, builds)
INT  Intelligence  → raciocínio, planejamento, síntese
WIS  Wisdom        → uso de contexto, memória, histórico
DEX  Dexterity     → velocidade de resposta, latência média
VIT  Vitality      → estabilidade, taxa de erro, resiliência
CHA  Charisma      → qualidade de comunicação, clareza de output
```

**Atributos especiais por agente:**

| Agente | Atributo Especial | Significado |
|---|---|---|
| code | `FORGE` | Capacidade de criar/modificar código |
| plan | `ORACLE` | Precisão de previsão e planejamento |
| debug | `SLEUTH` | Eficácia em encontrar causas-raiz |
| orchestrator | `COMMAND` | Capacidade de coordenar múltiplos agentes |
| ask | `LORE` | Amplitude de conhecimento e pesquisa |

**Resistências** (imunidades/fraquezas a tipos de task):
```
RES_COMPLEXITY   → tolerância a tasks ambíguas
RES_CONTEXT_LOSS → tolerância a janela de contexto longa
RES_TOOL_FAIL    → recuperação de falhas de ferramenta
RES_RATE_LIMIT   → tolerância a throttling do provider
```

### 5.3 Character Chart — Layout Visual

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚔  CODE AGENT                              [kilo-native]    ║
║  "The Forge Master"                    ● ACTIVE · 14m uptime  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  [avatar pixel art]    BASE ATTRIBUTES                        ║
║                                                               ║
║  [ CODE ]             STR ████████████████░░░░  82/100       ║
║  green flame icon     INT ██████████████░░░░░░  70/100       ║
║                       WIS ████████████░░░░░░░░  60/100       ║
║                       DEX ██████████████████░░  88/100       ║
║                       VIT ████████████████░░░░  78/100       ║
║                       CHA █████████████░░░░░░░  65/100       ║
║                                                               ║
║  SPECIAL                                                      ║
║  FORGE ████████████████████  100/100  ★ MAXED                ║
║                                                               ║
║  ACTIVE SKILLS                                                ║
║  [deep-trace] [code-review] [test-gen]  [+ add skill]        ║
║                                                               ║
║  RESISTANCES                                                  ║
║  COMPLEXITY  ████████░░  72%    CONTEXT_LOSS ███████░░  68%  ║
║  TOOL_FAIL   █████████░  87%    RATE_LIMIT   ██████░░░  62%  ║
║                                                               ║
║  SOUL        kilo-native (built-in)   [📋 ver] [✏ editar]   ║
║  PROVIDER    github-copilot · gpt-5.2-codex                  ║
║  DOMAIN      execution                                        ║
║                                                               ║
║  SESSION STATS                                                ║
║  msgs: 24   tokens: 12.4k   cost: $0.048   tasks: 3 done    ║
╠═══════════════════════════════════════════════════════════════╣
║  [Abrir Chat] [⏹ STOP] [🧠 Memória] [Reatribuir] [Encerrar]  ║
╚═══════════════════════════════════════════════════════════════╝
```

### 5.4 Schema YAML por Agente (`expertise-matrix/characters/`)

```yaml
# expertise-matrix/characters/code.yaml
agent: code
display_name: "The Forge Master"
tagline: "Default. Executes tools, edits code."
color: "#9aab7f"
icon: "⚔"

base_attributes:
  STR: 82
  INT: 70
  WIS: 60
  DEX: 88
  VIT: 78
  CHA: 65

special:
  name: FORGE
  value: 100
  description: "Capacidade de criar e modificar código com precisão cirúrgica"

resistances:
  COMPLEXITY:   72
  CONTEXT_LOSS: 68
  TOOL_FAIL:    87
  RATE_LIMIT:   62

default_skills: [code-review, test-gen]
preferred_domains: [execution, quick, local, creative]
preferred_providers: [github-copilot, kimi-for-coding, openai]
preferred_models:
  github-copilot: gpt-5.2-codex
  kimi-for-coding: k2p5
  openai: gpt-5.1-codex
```

### 5.5 Os Cinco Personagens

| Agente | Título | Cor | Especial | Força | Fraqueza |
|---|---|---|---|---|---|
| code | The Forge Master | Verde-lima | FORGE 100 | STR/DEX máximos | WIS baixo (foco no presente) |
| plan | The Oracle | Azul-safira | ORACLE 100 | INT/WIS máximos | STR mínimo (não executa) |
| debug | The Sleuth | Vermelho | SLEUTH 100 | WIS/VIT máximos | CHA baixo (direto ao ponto) |
| orchestrator | The Commander | Dourado | COMMAND 100 | CHA/INT máximos | DEX baixo (overhead de coord.) |
| ask | The Lorekeeper | Prata | LORE 100 | INT/CHA máximos | STR mínimo (somente leitura) |

---

## 6. Tier 4 — argenta-CLI (`mc` commands)

### 6.1 Estrutura

```
cli/
  mc.mjs              → entry point
  commands/
    status.mjs        → visão geral do hive
    agent.mjs         → gestão de agentes
    board.mjs         → bulletin board
    task.mjs          → kanban
    hive.mjs          → operações de colmeia
    chat.mjs          → chat interativo via CLI
```

### 6.2 Comandos

```bash
# Visão geral
mc status                              # hive status resumido
mc status --full                       # todos os agentes + stats

# Agentes
mc agent list                          # lista todos os agentes ativos
mc agent show <id>                     # character chart no terminal (ASCII)
mc agent spawn <soul-file> <mission>   # spawna Zambia
mc agent stop <id>                     # para agente
mc agent talk <id> <message>           # envia mensagem direta
mc agent redirect <id> <prov> <model>  # troca provider/model sem perder sessão
mc agent memory <id>                   # exibe memória/summary do agente
mc agent skill add <id> <skill>        # adiciona skill on-demand
mc agent close <id>                    # encerra sessão + marca done

# Bulletin Board
mc board read [--topic <t>] [--agent <a>] [--thread <thread>]
mc board post <topic> <content>
mc board reply <msg-id> <content>
mc board mark-read <msg-id>

# Tasks / Kanban
mc task list [--status <s>]
mc task move <id> <status>
mc task add <title> [--domain <d>] [--agent <a>]
mc task remove <id>

# Hive operations
mc hive brainstorm <topic> [--agents all|<ids>]   # abre thread, convida agentes
mc hive broadcast <topic> <message>                # mensagem para todos os agentes
mc hive snapshot                                   # salva estado completo do hive

# Chat interativo (REPL)
mc chat <agent-id>                     # abre REPL de chat no terminal
```

### 6.3 Integração Argenta

A Argenta usa os mesmos endpoints `/api/*` do Mission Control UI.
Internamente, chama via `fetch` quando precisa orquestrar:

```
Argenta detecta tarefa complexa
  → mc agent spawn souls/specialized.yaml "missão específica"
  → mc board read --topic task-result --thread <thread-id>
  → aguarda resposta via WS / polling
  → mc task move <id> done
  → mc agent close <zambia-id>
```

---

## 7. Endpoints do Server (evolução)

### Novos endpoints necessários

```
GET  /api/hive/agents              → lista todos os agentes (hive/agents.json)
POST /api/hive/agents              → registrar novo agente (spawn)
GET  /api/hive/agents/:id          → detalhes + character chart data
PATCH /api/hive/agents/:id         → atualizar status, skills, soul, provider
DELETE /api/hive/agents/:id        → encerrar agente (+ marca task done)

POST /api/hive/agents/:id/heartbeat → agente reporta pulso
GET  /api/hive/agents/:id/memory   → summary de memória

GET  /api/bus                      → ler mensagens (filtrável)
POST /api/bus                      → postar mensagem
PATCH /api/bus/:id                 → atualizar status (read/archived)
POST /api/bus/:id/reply            → responder mensagem

GET  /api/characters               → fichas de todos os personagens (YAML parseado)
GET  /api/characters/:agent        → ficha específica
PATCH /api/characters/:agent       → atualizar atributos (crescimento)
```

---

## 8. Estrutura de Arquivos (após implementação)

```
holistic-mission-control/
├── expertise-matrix/
│   ├── matrix.yaml                  (já existe)
│   └── characters/
│       ├── code.yaml
│       ├── plan.yaml
│       ├── debug.yaml
│       ├── orchestrator.yaml
│       └── ask.yaml
├── hive/
│   ├── agents.json                  (registro de todos os agentes ativos)
│   ├── heartbeats.jsonl             (pulsos)
│   └── memory/                      (summaries por agente)
│       └── agt-{id}.md
├── bus/
│   └── messages.jsonl               (barramento de mensagens)
├── skills/
│   ├── deep-trace.yaml
│   ├── web-search.yaml
│   ├── code-review.yaml
│   ├── brainstorm.yaml
│   ├── memory-recall.yaml
│   └── ...
├── souls/
│   ├── senior-debugger.yaml
│   ├── research-analyst.yaml
│   ├── creative-architect.yaml
│   └── ...
├── cli/
│   ├── mc.mjs                       (argenta-CLI entry point)
│   └── commands/
│       ├── status.mjs
│       ├── agent.mjs
│       ├── board.mjs
│       ├── task.mjs
│       └── hive.mjs
├── kilo-adapter/                    (já existe)
├── ralph-loop/                      (já existe)
└── ui/                              (já existe)
    ├── server.mjs                   (+ novos endpoints)
    └── index.html                   (+ Hive Panel, Bulletin Board, Character Chart)
```

---

## 9. Sequência de Implementação

### Sprint 1 — Character Charts (próxima sessão)
- [ ] Criar `expertise-matrix/characters/*.yaml` (5 fichas)
- [ ] Endpoint `GET /api/characters`
- [ ] UI: Character Chart modal/panel com visual Diablo-style
- [ ] Integrar com `renderAgents()` (click no agent card → character chart)

### Sprint 2 — Agent Identity + Hive Store
- [ ] Schema `hive/agents.json`
- [ ] Endpoints `/api/hive/agents` (CRUD)
- [ ] Heartbeat system
- [ ] UI: Hive Panel (substituir painel esquerdo atual)
- [ ] Agent Control Panel (modal completo)

### Sprint 3 — Message Bus + Bulletin Board
- [ ] `bus/messages.jsonl` + endpoints `/api/bus`
- [ ] WS broadcast para novos posts
- [ ] UI: Bulletin Board (painel direito, substituindo eventos simples)
- [ ] Thread view + reply

### Sprint 4 — Skills + Souls
- [ ] Schema YAML de skills e souls
- [ ] Injeção de skills na sessão Kilo ao spawnar
- [ ] UI: skill editor no Agent Control Panel
- [ ] Soul editor (textarea de system prompt)

### Sprint 5 — argenta-CLI
- [ ] `cli/mc.mjs` entry point
- [ ] Comandos `status`, `agent`, `board`, `task`
- [ ] Integração com endpoints do server
- [ ] Modo REPL para `mc chat`

### Sprint 6 — Zambias + Spawn System
- [ ] UI: modal de spawn com soul + skills + mission
- [ ] Server: criar agente Kilo com soul injetado no system prompt
- [ ] Tracking de linhagem (parent → children)
- [ ] Auto-encerramento de task-agents após conclusão

---

## 10. Notas de Design

**Princípio 1 — CLI-first:**
Toda funcionalidade da UI deve ser acessível via CLI. A Argenta opera via CLI.

**Princípio 2 — Estado explícito:**
Nada deve estar apenas na memória do processo. Todo estado relevante vai para arquivo
(agents.json, bus.jsonl, heartbeats.jsonl). O server é stateless entre restarts — exceto
as chatSessions ativas (inevitável com Kilo síncrono).

**Princípio 3 — Crescimento orgânico:**
Os atributos do Character Chart começam hardcoded no YAML mas evoluem com uso real.
A cada `dispatch_done` ou `chat_response`, o server atualiza pequenas frações dos stats.

**Princípio 4 — Interoperabilidade:**
Zambias são agentes Kilo normais — a diferença é o system prompt (soul + skills + mission)
injetado na criação da sessão. O substrato Kilo não sabe da diferença.

**Princípio 5 — Visibilidade total:**
O orquestrador (humano ou Argenta) deve conseguir ver qualquer agente, em qualquer estado,
a qualquer momento. Sem caixas pretas.

---

*Próxima sessão: implementar Sprint 1 — Character Charts.*
