# CHANGELOG — Holistic Mission Control
> Histórico append-only de entregas.
> Nunca editar entradas anteriores — apenas adicionar.
> Formato: HIVE_GROWTH_PROTOCOL.md §2.4

---

## [Sprint 8] — Argenta Orchestrator + Memória Episódica + Organic Growth ✅
**data:** 2026-03-07 · **sprint:** 8.0–8.4 · **domínio:** backend · infra · frontend · docs

### S8.0 — Start Infrastructure + Boot Scene
- `start.mjs` — orquestrador de processos (ui→loop, kill gracioso, banner ANSI colorido)
- `start-mc.bat` — launcher Windows kiosk (Chrome/Edge `--app --start-fullscreen`)
- Welcoming boot screen: scanlines, logo ASCII animado, checklist de subsistemas em tempo real, progress bar, fade dramático
- `npm start` mapeado em package.json

### S8.1 — POST /api/exec + Skill mc-control
- `POST /api/exec` — executa mc commands via subprocess com whitelist de segurança (status/agent/task/board/hive/chat)
- Cada execução gera evento auditável em `ops/events.jsonl`
- `skills/mc-control.yaml` — skill injetável com mapa completo de comandos para Argenta usar

### S8.2 — Memória Episódica Híbrida (Ollama + Qdrant)
- `memory/episodic.mjs` — Ollama embedding-gemma (localhost:11434) + Qdrant (localhost:6333)
- Cria coleção `hmc_episodic` automaticamente · graceful degradation: Qdrant offline → cache local JSON
- Sync automático ao reconectar · busca local por cosine similarity como fallback
- `upsertSession()` disparado ao fechar chat (`DELETE /chat/:key`)
- `GET /api/hive/agents/:id/memory?q=texto` → busca semântica nas memórias do agente

### S8.3 — Organic Growth (Auto + Manual)
- Auto-growth: task→done bumpa atributo do agente (domain→attr, priority→+1/2/3 pts, cap 100)
- `wsBroadcast character_updated` com payload de crescimento · flash visual "+N ATTR" no card
- ACP UI: seção `// Crescimento` com botões +/− por atributo (STR/INT/WIS/DEX/VIT/CHA)
- `onCharacterUpdated()` WS handler conectado · `charactersData` atualizado em tempo real

### Impacto
Argenta controla a colmeia programaticamente. Memórias persistem como vetores pesquisáveis.
Agentes crescem organicamente pelo uso. Colmeia viva, autônoma e evolutiva.

### Arquivos
`start.mjs` · `start-mc.bat` · `package.json` · `ui/index.html` · `ui/server.mjs` · `memory/episodic.mjs` · `skills/mc-control.yaml` · `hive/memory/cache/`

### Status
✅ entregue · 2026-03-07 · aguardando aprovação

---

## [Sprint 7.5] — docs: Scribe Review Final ✅
**data:** 2026-03-07
**sprint:** 7.5
**domínio:** docs

### Scribe Review — Checklist de Integridade
- [x] CHANGELOG.md tem entradas S7.1, S7.2, S7.3, S7.4, S7.5
- [x] ARCHITECTURE.md reflete o estado atual (endpoints, WS events, gaps fechados)
- [x] HELP-HUMAN.md cobre todas as features: chat, kanban, board, CLI, zambia, cooperação
- [x] HELP-AI.md atualizado com novos endpoints (memory, PATCH characters), padrões de integração
- [x] HIVE_GROWTH_PROTOCOL.md: S7.1–S7.5 todos marcados [x]
- [x] HIVE_BLUEPRINT.md: S1–S6 marcados [x]
- [x] README.md: landing page GitHub completa

### Critérios de Aceitação do Sprint 7 — Todos Verificados
- [x] Todos os 5 gaps do audit fechados (hive/memory, /memory endpoint, PATCH characters, uptime_ms, mc agent memory)
- [x] CHANGELOG.md com entradas retroativas S1–S6 + S7
- [x] ARCHITECTURE.md com TL;DR + mapa técnico completo
- [x] HELP-HUMAN.md — 12 seções, humano leigo consegue operar
- [x] HELP-AI.md — 13 seções, injetável, token-eficiente
- [x] Painel [?] no dashboard: 8 seções navegáveis, fluido, shortcuts de teclado
- [x] Sync infrastructure funcionando (sync-hmc.sh + GitHub Actions)
- [x] SYNC.md documentando o mecanismo completo
- [x] Scribe Protocol aplicado a cada sub-sprint

### Status
✅ Sprint 7 entregue e auditado · 2026-03-07
✅ **APROVADO pelo usuário · 2026-03-07**

---

## [Sprint 7.4] — frontend: Help UI Panel ✅
**data:** 2026-03-07
**sprint:** 7.4
**domínio:** frontend

### Entregues
- `[?] HELP` button no header do dashboard (abre com clique ou tecla `?`)
- Help overlay full-screen com painel de navegação lateral (8 itens) e área de conteúdo
- 8 seções implementadas e navegáveis:
  - O Que É · Primeiros Passos · Guia de Agentes · Bulletin Board
  - CLI Reference · Conceitos-Chave · Cooperação com IA · FAQ
- Estilos consistentes com palette olive/glass do dashboard
- Botão "Pergunte à Argenta →" abre chat com The Lore Keeper (agente `ask`)
- Keyboard shortcut `?` abre o painel, `Escape` fecha
- Click fora do painel fecha o overlay

### Impacto
Usuário navega pelo Help sem sair do flow do dashboard.
FAQ cobre erros comuns. CLI Reference cobre todos os comandos mc.
Seção Cooperação com IA ensina o padrão de trabalho humano-agente.

### Arquivos Modificados
- `ui/index.html` — CSS (.help-overlay + componentes) + HTML (overlay completo) + JS (openHelp/closeHelp/helpGoTo)

### Docs Atualizados
- `CHANGELOG.md` — esta entrada
- `HIVE_GROWTH_PROTOCOL.md` — S7.4 marcado [x]

### Status
✅ entregue · 2026-03-07

---

## [Sprint 7.3] — docs: Documentation Layer ✅
**data:** 2026-03-07
**sprint:** 7.3
**domínio:** docs

### Entregues
- `ARCHITECTURE.md` — mapa técnico vivo: TL;DR 90s + 9 seções (camadas, endpoints, WS events, identity flow, CLI, persistência, Kilo, sync)
- `HELP-HUMAN.md` — tutorial narrativo e didático para humanos leigos: 12 seções, tabelas de agentes/status/tópicos, guia de cooperação com IA
- `HELP-AI.md` — contexto estruturado e token-eficiente para agentes IA: 13 seções, API reference completa, fluxos de injeção, padrões de integração, Protocolo Scribe §crescimento semântico

### Impacto
Qualquer agente (humano ou IA) pode assimilar o sistema em leitura superficial.
HELP-AI.md é diretamente injetável como contexto de sistema em novos agentes.
Protocolo Scribe agora tem instrução explícita de como crescer cada doc semanticamente.

### Arquivos Modificados
- `ARCHITECTURE.md` (criado)
- `HELP-HUMAN.md` (criado)
- `HELP-AI.md` (criado)

### Docs Atualizados
- `CHANGELOG.md` — esta entrada
- `HIVE_GROWTH_PROTOCOL.md` — S7.1, S7.2, S7.3 marcados [x]

### Status
✅ entregue · 2026-03-07

---

## [Sprint 7.2] — backend: Gap Closure ✅
**data:** 2026-03-07
**sprint:** 7.2
**domínio:** backend · cli

### Entregues
- `hive/memory/.gitkeep` — diretório criado para summaries de agentes
- `GET /api/hive/agents/:id/memory` — retorna stats, summary, último msg, qdrant_collection
- `PATCH /api/characters/:agent` — crescimento orgânico: attributes/resistances/special + YAML persistido + WS `character_updated`
- `uptime_ms` calculado como `Date.now() - born` em `updateAgentStats()`
- `mc agent memory <id>` — wired ao endpoint, exibe sumário + stats + último msg

### Impacto
Fecha todos os 5 gaps do audit de entrega S1–S6. Taxa de entrega: 100%.
Atributos do Character Chart agora suportam crescimento orgânico via PATCH.

### Arquivos Modificados
- `ui/server.mjs` — 3 novos endpoints + uptime_ms fix
- `cli/commands/agent.mjs` — cmdMemory + router
- `hive/memory/.gitkeep` (criado)

### Status
✅ entregue · `afd79c7`

---

## [Sprint 7.1] — config: Sync Infrastructure ✅
**data:** 2026-03-07
**sprint:** 7.1
**domínio:** config · infra

### Entregues
- `sync-hmc.sh` — script bash de sync standalone → argenta-holistic-control
- `npm run sync:hmc` — alias no package.json
- `.github/workflows/scribe-notify.yml` — push summary + sync workspace opcional via secret
- `SYNC.md` — arquitetura completa, dois flows, roadmap até fork agnóstico (S9)

### Impacto
Qualquer agente sincroniza os dois repos com um único comando.
GitHub Actions pronto para ativar sync automático com 1 secret (ARGENTA_SYNC_TOKEN).

### Arquivos Modificados
- `sync-hmc.sh` (criado)
- `package.json` (scripts sync:hmc)
- `.github/workflows/scribe-notify.yml` (criado)
- `SYNC.md` (criado)

### Docs Atualizados
- `CHANGELOG.md` — esta entrada
- `HIVE_GROWTH_PROTOCOL.md` — S7.1 marcado [x]

### Status
✅ entregue · argenta-holistic-control `b02c58d` · argenta_fenix `ab5c70c`

---

## [Sprint 6.0] — Zambias + Spawn System ✅
**data:** 2026-03-06
**sprint:** 6
**domínio:** backend · frontend

### Entregues
- `#modal-spawn` — formulário completo com soul/skills/mission/parent/auto_close
- `spawnZambia()` → POST /api/hive/agents + POST activate em sequência
- Server: `POST /api/hive/agents/:id/activate` com soul+skills injetados na sessão Kilo
- Lineage tree no Hive Panel (zambias com parent indentados sob nativo)
- Auto-close: `auto_close: true` + idle 5min + WS `agent_autoclosed`

### Impacto
Colmeia passa a suportar sub-agentes especializados com identidade completa.
Argenta pode spawnar zambias com missão específica, monitorá-los e auto-encerrá-los.

### Arquivos Modificados
- `ui/server.mjs` — activate endpoint + auto-close logic
- `ui/index.html` — spawn modal + lineage render + WS handler

### Status
✅ entregue · auditado em 2026-03-07

---

## [Sprint 5.0] — argenta-CLI ✅
**data:** 2026-03-06
**sprint:** 5
**domínio:** cli

### Entregues
- `cli/mc.mjs` — entry point com parseArgs, ANSI colors, API client, shared helpers
- `cli/commands/status.mjs` — hive overview completo
- `cli/commands/agent.mjs` — list/show/spawn/stop/talk/skill/redirect/close
- `cli/commands/board.mjs` — read/post/reply/mark-read/delete
- `cli/commands/task.mjs` — list/add/move/remove/show
- `cli/commands/hive.mjs` — broadcast/snapshot/brainstorm
- `cli/commands/chat.mjs` — REPL com histórico, /sair, /limpar, /status
- `package.json` — `"bin": { "mc": "./cli/mc.mjs" }` + script

### Impacto
Toda a funcionalidade do Mission Control acessível via terminal.
Argenta pode operar o hive via subprocess sem depender da UI.

### Arquivos Modificados
- `cli/mc.mjs` (criado)
- `cli/commands/*.mjs` (6 arquivos criados)
- `package.json` (bin + script adicionados)

### Gap identificado
- `mc agent memory <id>` listado no help mas endpoint `/api/hive/agents/:id/memory` não existia → deferred S7.2

### Status
✅ entregue · auditado em 2026-03-07

---

## [Sprint 4.0] — Skills + Souls ✅
**data:** 2026-03-06
**sprint:** 4
**domínio:** backend · frontend · config

### Entregues
- 9 skills YAML em `skills/` com campo `inject` (blocos de prompt)
- 4 souls YAML em `souls/` com persona/directives/restrictions/tone
- `GET /api/skills`, `GET /api/skills/:name`
- `GET /api/souls`, `GET /api/souls/:name`
- `buildAgentContext(char, agentName, soul, activeSkills)` — sistema de injeção
- First-message-prime: contexto injetado como prefixo da primeira mensagem
- Session restore: sessão Kilo expirada → recria + re-injeta automaticamente
- Skill editor no ACP modal (chips toggle)
- Soul editor no ACP modal (selector + textarea)
- Skills exibidas no Character Chart modal
- `POST /api/hive/agents/:id/activate` — pré-injeta ao spawnar

### Impacto
Agentes passam a ter identidade injetável nas sessões Kilo.
Kilo não sabe a diferença — a identidade é transparente no substrato.

### Arquivos Modificados
- `skills/*.yaml` (9 arquivos criados)
- `souls/*.yaml` (4 arquivos criados)
- `ui/server.mjs` — loadSkills, loadSouls, buildAgentContext, activate endpoint
- `ui/index.html` — ACP skill/soul editor + Character Chart skills section

### Status
✅ entregue · auditado em 2026-03-07

---

## [Sprint 3.0] — Message Bus + Bulletin Board ✅
**data:** 2026-03-06
**sprint:** 3
**domínio:** backend · frontend

### Entregues
- `bus/messages.jsonl` — barramento append-only criado
- `GET /api/bus` com filtros: topic · from · thread · n
- `POST /api/bus` — nova mensagem com validação de topic
- `PATCH /api/bus/:id` — atualiza status/content
- `DELETE /api/bus/:id` — remove mensagem (bonus)
- `POST /api/bus/:id/reply` — adiciona reply aninhado
- WS broadcast: `bus_message` (novo post) + `bus_updated` (PATCH/DELETE)
- Bulletin Board UI no painel direito (substitui eventos simples)
- Cards expansíveis com thread view + compose + filtros

### Impacto
Colmeia passa a ter canal de comunicação assíncrono entre agentes.
9 tópicos padrão definidos (orchestration/debug/brainstorm/etc).

### Arquivos Modificados
- `bus/messages.jsonl` (criado)
- `ui/server.mjs` — loadBus, saveBus, todos endpoints /api/bus
- `ui/index.html` — Bulletin Board UI completo

### Status
✅ entregue · auditado em 2026-03-07

---

## [Sprint 2.0] — Agent Identity + Hive Store ✅
**data:** 2026-03-05
**sprint:** 2
**domínio:** backend · frontend

### Entregues
- `hive/agents.json` — 5 agentes nativos populados (code/plan/debug/orchestrator/ask)
- `GET /api/hive/agents` — lista todos os agentes
- `POST /api/hive/agents` — registra novo agente
- `GET /api/hive/agents/:id` — detalhes enriquecidos com character + chat data
- `PATCH /api/hive/agents/:id` — atualiza campos (status/soul/skills/etc)
- `DELETE /api/hive/agents/:id` — remove agente
- `POST /api/hive/agents/:id/heartbeat` — pulso + append em heartbeats.jsonl
- `zombieCheck()` — 2min sem heartbeat → zombie (a cada 30s)
- `syncNativeAgentStatus()` — sync status nativos com chatSessions (a cada 5s)
- `updateAgentStats()` — atualiza msgs/tokens/cost após chat_response
- Hive Panel UI — linhagem (nativos + zambias indentados)
- Agent Control Panel modal — status/provider/model/skills/soul/stats

### Arquivos Modificados
- `hive/agents.json` (criado)
- `hive/heartbeats.jsonl` (criado)
- `ui/server.mjs` — loadHive, saveHive, syncNativeAgentStatus, zombieCheck, todos endpoints /api/hive
- `ui/index.html` — Hive Panel + ACP modal

### Gaps identificados
- `GET /api/hive/agents/:id/memory` não implementado → deferred S7.2
- `hive/memory/` directory não criado → deferred S7.2

### Status
✅ entregue · auditado em 2026-03-07

---

## [Sprint 1.0] — Character Charts ✅
**data:** 2026-03-05
**sprint:** 1
**domínio:** config · backend · frontend

### Entregues
- `expertise-matrix/characters/code.yaml` — The Forge (FORGE 100)
- `expertise-matrix/characters/plan.yaml` — The Oracle (ORACLE 100)
- `expertise-matrix/characters/debug.yaml` — The Sleuth (SLEUTH 100)
- `expertise-matrix/characters/orchestrator.yaml` — The Commander (COMMAND 100)
- `expertise-matrix/characters/ask.yaml` — The Lore Keeper (LORE 100)
- `GET /api/characters` — todas as fichas parseadas
- `GET /api/characters/:agent` — ficha específica
- Character Chart modal Diablo-style com barras de atributos ASCII
- `openCharacterModal()` integrado ao Hive Panel

### Divergência de schema
- Blueprint define `base_attributes`, YAML implementado usa `attributes`
- Server lê `char.attributes` corretamente → divergência não bloqueante

### Gaps identificados
- `PATCH /api/characters/:agent` não implementado → deferred S7.2

### Status
✅ entregue · auditado em 2026-03-07

---

## [Infra] — Repositório GitHub criado ✅
**data:** 2026-03-07
**sprint:** infra
**domínio:** config

### Entregues
- Repositório `argenta-holistic-control` criado (privado)
- Account: `rabelojunior81-collab`
- 48 arquivos · 8978 linhas no commit inicial
- `.gitignore` excluindo `node_modules/` e `ops/chat-sessions.json`
- Branch: `master` tracking `origin/master`

### Status
✅ entregue

---

## [Docs] — HIVE_GROWTH_PROTOCOL.md criado 🔄
**data:** 2026-03-07
**sprint:** 7.0 (início)
**domínio:** docs

### Entregues
- `HIVE_GROWTH_PROTOCOL.md` — metodologia molecular + Protocolo Scribe + roadmap S7–S9
- `HIVE_BLUEPRINT.md` — S1–S6 marcados como `[x]`, status congelado adicionado
- `CHANGELOG.md` — este arquivo, com entradas retroativas S1–S6

### Impacto
Colmeia passa a ter metodologia explícita de crescimento.
Qualquer agente pode entender onde estamos e como contribuir sem histórico da sessão.

### Arquivos Modificados
- `HIVE_GROWTH_PROTOCOL.md` (criado)
- `HIVE_BLUEPRINT.md` (atualizado — sprints marcados + status)
- `CHANGELOG.md` (criado — este arquivo)

### Status
🔄 em progresso — Sprint 7 em execução
