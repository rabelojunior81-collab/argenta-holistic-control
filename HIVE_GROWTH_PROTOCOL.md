# HIVE GROWTH PROTOCOL
> Versão 0.1 — 2026-03-07
> Metodologia de Evolução + Protocolo Scribe + Roadmap Sprint 7+
> Extensão viva do `HIVE_BLUEPRINT.md` (Sprints 1–6 entregues e auditados)

---

## TL;DR — Leia em 60 segundos

Este documento define **como a colmeia cresce** — não o que ela é (ver
`HIVE_BLUEPRINT.md`), mas como ela se desenvolve, valida e documenta
suas próprias evoluções. Três pilares:

1. **Metodologia Molecular** — ciclo explícito de 8 fases que toda entrega segue
2. **Protocolo Scribe** — rotina de auto-documentação disparada a cada sub-sprint
3. **Roadmap** — Sprints 7–9 com sub-sprints especializados e critérios de aceitação

Qualquer agente (humano ou IA) que precisar contribuir com o projeto
deve ler este documento antes de escrever qualquer linha de código.

---

## 1. Metodologia Molecular — O Ciclo de Entrega

Sprints são a granulação visível. O **molecular** é o que acontece
dentro de cada sprint — o ciclo que garante que entregamos a coisa
certa, da forma certa, sem perder contexto entre sessões.

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1 — INTENT                                                 │
│  Definir o problema com precisão.                               │
│  Entradas: diretiva do usuário / backlog item                   │
│  Saída:    enunciado claro + critérios de aceitação listados    │
├─────────────────────────────────────────────────────────────────┤
│  FASE 2 — RESEARCH                                               │
│  Ler arquivos relevantes. Mapear constraints. Explorar opções.  │
│  Entradas: Intent definida                                      │
│  Saída:    mapa de dependências + opções de implementação       │
├─────────────────────────────────────────────────────────────────┤
│  ⚡ INFLEXÃO — ponto de não-retorno da pesquisa                  │
│  Pergunta obrigatória: "O que encontramos muda a intenção?"     │
│  Se SIM  → revisar INTENT antes de prosseguir                  │
│  Se NÃO  → consolidar e definir a rota                         │
│  Função: evita construir a coisa certa da forma errada,        │
│           ou a coisa errada perfeitamente.                      │
├─────────────────────────────────────────────────────────────────┤
│  FASE 3 — CONSOLIDAÇÃO DA INTENÇÃO                               │
│  Decisões arquiteturais tomadas. Ambiguidade zero.              │
│  Entradas: Research + Inflexão resolvida                        │
│  Saída:    lista de sub-sprints com escopo fixo e domínio       │
├─────────────────────────────────────────────────────────────────┤
│  FASE 4 — SUB-SPRINTS ESPECIALIZADOS                             │
│  Execução em domínios isolados e sequencialmente validados:     │
│    backend   → server.mjs, endpoints, data layer               │
│    frontend  → index.html, UI components, estilos              │
│    cli       → mc commands, helpers, REPL                      │
│    config    → YAML schemas, JSON stores, env vars             │
│    docs      → SCRIBE (disparado ao fim de cada sub-sprint)    │
│  Regra: cada sub-sprint entregue dispara o Protocolo Scribe.   │
├─────────────────────────────────────────────────────────────────┤
│  FASE 5 — TESTE                                                  │
│  Manual: servidor rodando, UI navegável, CLI executável.        │
│  Integração: fluxo end-to-end do caso de uso principal.         │
│  Critério mínimo: feature funciona + sem regressões visíveis.  │
├─────────────────────────────────────────────────────────────────┤
│  FASE 6 — VALIDAÇÃO                                              │
│  Cada critério de aceitação da FASE 1 verificado explicitamente.│
│  "Parece certo" não é validação. "Critério X: ✅" é validação.  │
├─────────────────────────────────────────────────────────────────┤
│  FASE 7 — SCRIBE REVIEW                                          │
│  Verificar que toda documentação foi atualizada organicamente.  │
│  Documentação incompleta = sub-sprint incompleto.               │
│  Escopo: ARCHITECTURE.md · CHANGELOG.md · HELP-*.md · Help UI  │
├─────────────────────────────────────────────────────────────────┤
│  FASE 8 — APROVAÇÃO                                              │
│  Gate humano ou Argenta (quando operar autonomamente).          │
│  Nenhum Sprint começa sem aprovação explícita do anterior.      │
│  Aprovação registrada no CHANGELOG.md com data e agente.        │
└─────────────────────────────────────────────────────────────────┘
```

**Regra de ouro:** Nenhuma linha de código antes da Consolidação (Fase 3).
Nenhuma aprovação sem Scribe Review completo (Fase 7).

---

## 2. Protocolo Scribe — Documentação Viva

### 2.1 Conceito

O Scribe é a rotina de auto-documentação da colmeia. Não é uma tarefa
extra no final — é parte integral do ciclo de entrega. Qualquer agente
(humano ou IA) que entrega um sub-sprint também executa o Scribe.

A colmeia que não se documenta não está viva. Está apenas rodando.

### 2.2 Acionamento

| Momento | Tipo |
|---|---|
| Ao completar qualquer sub-sprint | Automático |
| Antes da Fase 8 (Aprovação) de qualquer Sprint | Obrigatório |
| Ao final de cada sessão de trabalho (parcial) | Recomendado |

### 2.3 O que o Scribe faz

```
Para cada sub-sprint entregue, o Scribe executa:

1. APPEND em CHANGELOG.md
   → Entrada estruturada: sprint · data · deliverables · impacto
   → Arquivos modificados · docs atualizados · status
   → Nunca edita entradas anteriores — somente adiciona

2. UPDATE em ARCHITECTURE.md
   → Seção afetada pelo sub-sprint atualizada semanticamente
   → Novos endpoints, componentes, schemas adicionados
   → Nunca remove informação válida — apenas evolui

3. UPDATE em HELP-HUMAN.md (se feature é user-facing)
   → Nova seção ou atualização de seção existente
   → Linguagem didática, exemplos concretos, sem jargão
   → Mantém consistência com o restante do documento

4. UPDATE em HELP-AI.md (se muda API contract ou fluxo)
   → Bloco de contexto atualizado com novo endpoint/comportamento
   → Formato estruturado otimizado para injeção em system prompt

5. UPDATE no Help UI Panel (se muda feature user-facing)
   → Conteúdo do painel [?] no dashboard atualizado
   → Consistência com HELP-HUMAN.md garantida

6. UPDATE em HIVE_GROWTH_PROTOCOL.md (este arquivo)
   → Checklist do sprint em execução atualizado
   → Sprint entregue marcado com [x] e data de entrega
```

### 2.4 Formato padrão de entrada no CHANGELOG

```markdown
## [Sprint X.Y] — domínio: Título Descritivo
**data:** YYYY-MM-DD
**sprint:** X.Y (ex: 7.2)
**domínio:** backend | frontend | cli | config | docs

### Entregues
- Item 1 entregue
- Item 2 entregue

### Impacto
Descrição do impacto sistêmico. O que isso habilita ou fecha?

### Arquivos Modificados
- `caminho/arquivo.ext` — o que mudou

### Docs Atualizados
- `ARCHITECTURE.md` §seção — o que foi atualizado
- `HELP-HUMAN.md` §seção — o que foi atualizado

### Status
✅ entregue · aguarda validação
```

### 2.5 Princípio de Crescimento Semântico

O Scribe opera em três modos, nunca em modo destrutivo:

| Modo | Onde aplica | Comportamento |
|---|---|---|
| **APPEND** | CHANGELOG.md | Somente adiciona — histórico imutável |
| **EVOLVE** | ARCHITECTURE.md, HELP-*.md | Merge semântico — cresce, não substitui |
| **MARK** | Este arquivo (checklists) | Marca `[x]` — nunca desmarca |

---

## 3. Camadas de Documentação — Mapa Completo

```
holistic-mission-control/
├── HIVE_BLUEPRINT.md         → arquitetura original (S1–S6) — congelado
├── HIVE_GROWTH_PROTOCOL.md   → este arquivo — metodologia + S7+
├── ARCHITECTURE.md           → mapa técnico vivo (TL;DR + detalhes)
├── CHANGELOG.md              → histórico append-only de entregas
├── SYNC.md                   → mecanismo de sincronização entre repos
├── README.md                 → landing page do projeto (GitHub)
├── HELP-HUMAN.md             → tutorial para humanos (didático, narrativo)
└── HELP-AI.md                → contexto estruturado para agentes IA
```

**Hierarquia de leitura para um agente novo:**
```
1. README.md TL;DR            (3 min — entende o que é)
2. ARCHITECTURE.md TL;DR      (5 min — entende como funciona)
3. CHANGELOG.md               (3 min — entende onde está)
4. HIVE_GROWTH_PROTOCOL.md    (5 min — entende como contribuir)
5. HELP-AI.md §api-reference  (sob demanda — opera o sistema)
```

---

## 4. Sprint 7 — Docs + Help + Sync + Gap Closure

**Intent:** Fechar os gaps do audit de entrega (S1–S6), estabelecer
toda a infraestrutura de documentação, implementar o painel Help no
dashboard e configurar a sincronização entre os dois repositórios.

**Critérios de Aceitação:**
- [ ] Todos os 5 gaps do audit fechados ou documentados como deferred
- [ ] `CHANGELOG.md` existe com entradas retroativas S1–S6 + S7
- [ ] `ARCHITECTURE.md` existe com TL;DR + mapa técnico completo
- [ ] `HELP-HUMAN.md` — humano leigo consegue operar o sistema sem apoio
- [ ] `HELP-AI.md` — agente IA opera via API sem contexto adicional
- [ ] Painel `[?]` no dashboard: navegável, fluido, todas as seções
- [ ] Sync infrastructure funcionando (script + GitHub Actions)
- [ ] `SYNC.md` documentando o mecanismo completo
- [ ] Scribe Protocol aplicado a cada sub-sprint deste Sprint

---

### S7.1 — config: Sync Infrastructure
```
Domínio: config + infra
Intent:  Manter argenta_fenix e argenta-holistic-control sincronizados

Entregues:
  - remote 'hmc' adicionado no workspace (argenta_fenix)
  - script sync-hmc.sh (ou npm run sync:hmc) — 1 comando
  - GitHub Actions workflow (.github/workflows/sync-hmc.yml)
    → trigger: push em sandbox/holistic-mission-control/**
    → action: git subtree push --prefix=... hmc master
  - SYNC.md explicando o mecanismo, quando usar e quando parar

Critério: npm run sync:hmc executa sem erro e reflete no repo remoto
```
- [ ] remote hmc configurado no workspace
- [ ] script `sync-hmc.sh` criado
- [ ] GitHub Actions workflow criado
- [ ] `SYNC.md` escrito
- [ ] Scribe: CHANGELOG.md entrada S7.1 · ARCHITECTURE.md §infra

---

### S7.2 — backend: Gap Closure
```
Domínio: backend
Intent:  Fechar os 5 gaps identificados no audit de entrega S1–S6

Gaps a fechar:
  1. hive/memory/ directory + .gitkeep
  2. GET /api/hive/agents/:id/memory endpoint
  3. PATCH /api/characters/:agent endpoint
  4. uptime_ms tracking em updateAgentStats()
  5. mc agent memory → wired ao endpoint

Critério: mc agent memory <id> retorna estrutura (stub ok) sem erro
```
- [ ] `hive/memory/.gitkeep` criado
- [ ] `GET /api/hive/agents/:id/memory` implementado
- [ ] `PATCH /api/characters/:agent` implementado
- [ ] `uptime_ms` calculado em `updateAgentStats()`
- [ ] `mc agent memory` wired
- [ ] Scribe: CHANGELOG.md S7.2 · ARCHITECTURE.md §endpoints · HELP-AI.md §api

---

### S7.3 — docs: Camada de Documentação
```
Domínio: docs
Intent:  Criar toda a infraestrutura documental do projeto

Entregues:
  - ARCHITECTURE.md (TL;DR + mapa técnico + todos os endpoints)
  - CHANGELOG.md (retroativo S1–S6 + S7 em progresso)
  - HELP-HUMAN.md (tutorial leigo completo, narrativo)
  - HELP-AI.md (contexto estruturado, injetável, token-eficiente)
  - Atualizar HIVE_BLUEPRINT.md (S1–S6 marcados com [x])

Critério: humano leigo lê HELP-HUMAN.md e consegue operar o sistema
```
- [ ] `ARCHITECTURE.md` criado com TL;DR
- [ ] `CHANGELOG.md` criado com entradas retroativas
- [ ] `HELP-HUMAN.md` criado (seções completas)
- [ ] `HELP-AI.md` criado (formato estruturado)
- [ ] `HIVE_BLUEPRINT.md` S1–S6 marcados `[x]`
- [ ] Scribe: CHANGELOG.md S7.3

---

### S7.4 — frontend: Painel Help UI
```
Domínio: frontend
Intent:  Painel [?] dedicado e fluido dentro do Mission Control

Seções:
  - O Que É (conceito + metáfora da colmeia)
  - Primeiros Passos (iniciar, dashboard, primeira conversa)
  - Guia de Agentes (5 nativos, zambias, spawn, ACP)
  - Guia do Bulletin Board (tópicos, threads, replies)
  - CLI Reference (todos os comandos mc com exemplos)
  - Conceitos-Chave (soul, skill, heartbeat, lineage)
  - Cooperação com IA (usar Argenta como copiloto)
  - FAQ (erros comuns, perguntas frequentes)

Visual: coerente com olive/glass do dashboard
Interação: seções expansíveis, botão "Pergunte à Argenta"

Critério: usuário navega pelo Help sem sair do flow do dashboard
```
- [ ] Aba `[?]` adicionada à navegação principal
- [ ] 8 seções implementadas e navegáveis
- [ ] Estilos consistentes com o dashboard
- [ ] Botão "Pergunte à Argenta" funcional
- [ ] Scribe: CHANGELOG.md S7.4 · HELP-HUMAN.md §help-ui

---

### S7.5 — docs: Scribe Review Final + Aprovação
```
Domínio: docs
Intent:  Verificar integridade de toda a documentação do Sprint 7
         e registrar aprovação formal

Checklist Scribe:
  - CHANGELOG.md tem entradas S7.1, S7.2, S7.3, S7.4
  - ARCHITECTURE.md reflete o estado atual do sistema
  - HELP-HUMAN.md cobre todas as features de S7
  - HELP-AI.md atualizado com novos endpoints
  - HIVE_GROWTH_PROTOCOL.md checklists de S7 marcados
  - README.md atualizado se necessário
  - Commit final com mensagem semântica
  - Push para argenta-holistic-control

Critério: todos os critérios de aceitação do Sprint 7 verificados
          + aprovação explícita do usuário registrada no CHANGELOG
```
- [ ] Scribe Review completo
- [ ] Todos os critérios de aceitação do Sprint 7 verificados
- [ ] Commit semântico + push para ambos os repos
- [ ] Aprovação registrada no CHANGELOG.md

---

## 5. Sprint 8 — Argenta Orchestrator + Qdrant

**Intent:** Argenta opera o Mission Control autonomamente via CLI,
dispara sub-agentes para tarefas complexas, monitora resultados e
armazena memória episódica via Qdrant.

**Critérios de Aceitação (a refinar na Fase 3 do Sprint 8):**
- Argenta executa mc commands via subprocess sem assistência humana
- Zambia spawned + auto-closed por Argenta sem intervenção
- Qdrant armazena embeddings de sessões de chat
- `GET /api/hive/agents/:id/memory` retorna dados reais

**Sub-sprints planejados:**
- S8.1 — backend: Argenta subprocess integration
- S8.2 — backend: Qdrant episodic memory
- S8.3 — backend/frontend: Organic attribute growth (PATCH characters)
- S8.4 — docs: Scribe Review + Aprovação

---

## 6. Sprint 9 — Fork Agnóstico

**Intent:** `argenta-holistic-control` torna-se produto independente.
Orquestradora plugável por configuração. Instalável em 5 minutos
por qualquer pessoa, com qualquer agente IA como coordenador.

**Critérios de Aceitação (a refinar na Fase 3 do Sprint 9):**
- Instalar + rodar sem dependências da Argenta Fênix específica
- README de produto (install guide, quick start, configuração)
- Souls e skills base genéricos (sem refs à Argenta)
- Orquestradora configurável via `config/orchestrator.json`
- Sincronização final → divergência intencional documentada

**Sub-sprints planejados:**
- S9.1 — config: Pluggable orchestrator
- S9.2 — config/docs: Generic souls/skills base set
- S9.3 — docs: Product README + install guide
- S9.4 — infra: Sync final → fork point documentado
- S9.5 — docs: Scribe Review + Aprovação

---

## 7. Backlog Pós-Sprint 9

| Item | Prioridade | Sprint sugerido |
|---|---|---|
| Argenta API integration nativa (não subprocess) | Alta | 10 |
| Web-based CLI (terminal no browser) | Média | 10 |
| Plugin system para skills externas | Média | 11 |
| Multi-hive federation | Média | 11 |
| Zambia marketplace (souls/skills compartilháveis) | Baixa | 12 |

---

## 8. Checklist Histórico de Sprints

### Sprint 1 — Character Charts ✅ ENTREGUE
- [x] `expertise-matrix/characters/*.yaml` — 5 fichas criadas
- [x] `GET /api/characters` + `GET /api/characters/:agent`
- [x] Character Chart modal Diablo-style no UI
- [x] Integrado ao Hive Panel (click no card → chart)
- [ ] `PATCH /api/characters/:agent` → **deferred S7.2**

### Sprint 2 — Agent Identity + Hive Store ✅ ENTREGUE
- [x] `hive/agents.json` — schema completo, 5 nativos populados
- [x] CRUD completo `/api/hive/agents` (GET/POST/PATCH/DELETE)
- [x] Heartbeat system (`POST /heartbeat` + `hive/heartbeats.jsonl`)
- [x] Zombie detection (2min sem heartbeat → zombie)
- [x] `syncNativeAgentStatus()` a cada 5s
- [x] Hive Panel UI com linhagem (nativos + zambias indentados)
- [x] Agent Control Panel modal completo
- [ ] `GET /api/hive/agents/:id/memory` → **deferred S7.2**
- [ ] `hive/memory/` directory → **deferred S7.2**

### Sprint 3 — Message Bus + Bulletin Board ✅ ENTREGUE
- [x] `bus/messages.jsonl` + CRUD `/api/bus` completo
- [x] `POST /api/bus/:id/reply`
- [x] `DELETE /api/bus/:id` (bonus)
- [x] WS broadcast: `bus_message` + `bus_updated`
- [x] Bulletin Board UI (painel direito) com threads + compose
- [x] Filtros: topic · from · thread · n

### Sprint 4 — Skills + Souls ✅ ENTREGUE
- [x] 9 skills YAML com campo `inject`
- [x] 4 souls YAML com persona/directives/restrictions
- [x] `GET /api/skills` + `GET /api/skills/:name`
- [x] `GET /api/souls` + `GET /api/souls/:name`
- [x] `buildAgentContext()` — injeta char + soul + skills no prompt
- [x] First-message-prime + session restore com re-injeção
- [x] Skill editor + Soul editor no ACP modal
- [x] `POST /api/hive/agents/:id/activate`

### Sprint 5 — argenta-CLI ✅ ENTREGUE
- [x] `cli/mc.mjs` entry point + parseArgs + ANSI + API client
- [x] `mc status` / `mc status --full`
- [x] `mc agent list/show/spawn/stop/talk/skill/redirect/close`
- [x] `mc board read/post/reply/mark-read/delete`
- [x] `mc task list/add/move/remove/show`
- [x] `mc hive broadcast/snapshot/brainstorm`
- [x] `mc chat <id>` REPL completo com histórico e /comandos
- [x] `package.json` com `"bin": { "mc": "./cli/mc.mjs" }`
- [ ] `mc agent memory <id>` → **deferred S7.2**

### Sprint 6 — Zambias + Spawn System ✅ ENTREGUE
- [x] `#modal-spawn` — formulário completo (soul/skills/mission/parent/auto_close)
- [x] `spawnZambia()` → POST + activate em sequência
- [x] Server: agente criado com soul+skills injetado na sessão Kilo
- [x] Lineage tree no Hive Panel (parent → filhos indentados)
- [x] Auto-close: `auto_close: true` + 5min idle + WS broadcast
- [x] WS `agent_autoclosed` → UI refresh

### Sprint 7 — Docs + Help + Sync + Gap Closure 🔄 EM PROGRESSO
- [ ] S7.1 Sync Infrastructure
- [ ] S7.2 Gap Closure
- [ ] S7.3 Documentation Layer
- [ ] S7.4 Help UI Panel
- [ ] S7.5 Scribe Review + Aprovação

### Sprint 8 — Argenta Orchestrator + Qdrant
- [ ] Planejado — aguarda aprovação do Sprint 7

### Sprint 9 — Fork Agnóstico
- [ ] Planejado — aguarda aprovação do Sprint 8

---

## 9. Princípios de Design — Adições ao Blueprint Original

Os princípios 1–5 estão definidos em `HIVE_BLUEPRINT.md §10`.
Este documento adiciona:

**Princípio 6 — Documentação como Código:**
Toda documentação vive no repositório, versiona junto com o código
e é tratada como deliverable obrigatório de cada sub-sprint.
Documentação incompleta = sub-sprint incompleto.

**Princípio 7 — Scribe como Primeiro Cidadão:**
O Scribe não é uma tarefa extra. É parte do ciclo de entrega.
Qualquer agente que entrega um sub-sprint também executa o Scribe.
A colmeia que não se documenta não está viva — está apenas rodando.

**Princípio 8 — Inflexão antes da Execução:**
Nenhuma linha de código antes da Consolidação da Intenção.
A Inflexão é o momento mais valioso do ciclo — onde evitamos
construir a coisa certa da forma errada, ou a coisa errada perfeitamente.

**Princípio 9 — Aprovação Explícita:**
Nenhum Sprint começa sem aprovação explícita do anterior.
A aprovação é um gate humano (ou Argenta, quando operar autonomamente).
"Parece certo" não é aprovação. "Critérios verificados: ✅" é aprovação.

---

*HIVE_GROWTH_PROTOCOL.md — Documento vivo*
*Atualizado a cada Sprint pelo Protocolo Scribe*
*Não sobrescrever — apenas evoluir*
