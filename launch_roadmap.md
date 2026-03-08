# LAUNCH ROADMAP — Holistic Mission Control

> **Documento Duplo:** Parte I é estática (auditoria post-mortem) · Parte II é orgânica e viva (roadmap de lançamento)
> **Inaugurado:** 2026-03-08 · Sprint 9 aberto
> **Guardiões:** Adilson + Argenta Fênix

---

# ═══════════════════════════════════════════════════
# PARTE I — AUDITORIA POST-MORTEM
# *O que foi. O que aprendemos. O estado atual verificado.*
# ═══════════════════════════════════════════════════

> Esta seção é **imutável por design.** Representa o conhecimento consolidado de tudo que aconteceu até a abertura da fase de lançamento. Novas entradas só podem ser adicionadas ao final, com data e contexto.

---

## 1.1 — LINHA DO TEMPO

```
2026-03-05  Sprint 1  Character Charts + Atributos RPG
2026-03-05  Sprint 2  Agent Identity + Hive Store + Heartbeat
2026-03-05  Sprint 3  Message Bus + Bulletin Board
2026-03-06  Sprint 4  Skills + Souls + Identity Injection
2026-03-06  Sprint 5  argenta-CLI (mc.mjs) — 6 grupos de comandos
2026-03-06  Sprint 6  Zambias + Spawn System + Lineage Tree
2026-03-07  Sprint 7  Docs + Help UI + Sync + Gap Closure (S7.1–S7.5)
2026-03-07  Sprint 8  Start Infrastructure + Episodic Memory + Organic Growth
2026-03-07  [BREAK]   Sessão de orquestração autônoma — experimento não supervisionado
2026-03-08  [HOTFIX]  Post-mortem: 6 bugs críticos corrigidos + auditoria geral
2026-03-08  [AGORA]   Abertura da fase de lançamento — Sprint 9 iniciado
```

---

## 1.2 — DECISÕES ARQUITETURAIS PERMANENTES

Estas decisões foram tomadas, testadas e confirmadas. Não devem ser revisadas sem motivo extremamente forte.

| # | Decisão | Racional | Data |
|---|---|---|---|
| A1 | **Node.js puro, sem frameworks** | Zero dependências de risco; total controle do comportamento; legível para qualquer dev Node. | 2026-03-05 |
| A2 | **JSON/JSONL como banco de dados** | Portabilidade máxima; append-only garante audit trail; sem setup de infra. | 2026-03-05 |
| A3 | **WebSocket manual (RFC 6455)** | Sem dependência de `ws` ou `socket.io`; educativo; controlável. | 2026-03-05 |
| A4 | **Kilo é o substrato, não é opcional** | A meta é usar Kilo para facilitar a orquestração. Sem fallback estático para providers. | 2026-03-08 |
| A5 | **Identity as Context (não como persistência)** | Soul + Skills são injetados como system prompt — não persistidos no Kilo. Flexibilidade máxima. | 2026-03-06 |
| A6 | **Porta 3030 local (127.0.0.1)** | Segurança por design — nunca exposto à WAN sem proxy explícito. | 2026-03-05 |
| A7 | **Episodic memory com degradação graciosa** | Qdrant + Ollama quando disponíveis; fallback silencioso para JSON local. | 2026-03-07 |
| A8 | **4 camadas de arquitectura** | CLI → UI/Server → Bus → Identity → Kilo. Separação de responsabilidades. | 2026-03-05 |

---

## 1.3 — OS 6 BUGS DA SESSÃO AUTÔNOMA — CASO DE ESTUDO

> A sessão de 2026-03-07 é o maior evento de aprendizado do projeto até aqui.
> Preservada aqui como material permanente de referência.

### Contexto
Uma sessão de orquestração autônoma foi executada para implementar: MCP integration, modal de sessão no kanban, sistema de consensus/delegation. Os módulos foram entregues, mas com 6 bugs críticos que quebraram o sistema completamente.

### Os Bugs

| ID | Severidade | Descrição | Causa Raiz | Fix |
|---|---|---|---|---|
| BUG-01 | 🔴 CRÍTICO | JS runtime crash total | `#modal-task-session` inserido APÓS a tag `</script>` — `getElementById` retornava `null` → `TypeError` → crash completo | Moveu modal para antes do `<script>` (linha ~2017) |
| BUG-02 | 🟠 ALTO | Providers jamais populados | Race condition: `populateProviders()` estava dentro de `if (!initialized)` — expertise-matrix carregava em <1s, Kilo em ~3s → `initialized=true` com providers vazios | `populateProviders()` movido para fora do guard |
| BUG-03 | 🟡 MÉDIO | Providers sempre vazios via API | Código verificava `data.authed` — Kilo retorna `data.connected` | Atualizado para `data.connected` com fallback chain |
| BUG-04 | 🟠 ALTO | CMD crash no start-mc.bat | Comentários `:: ──────` com U+2500 após `chcp 65001` → CMD tentava executar Unicode como comando | Reescrito completamente com `rem` + ASCII puro |
| BUG-05 | 🟡 MÉDIO | `tokens_used` corrompido nos agentes | Concatenação de string em vez de adição numérica → `"0[object Object][object Object]..."` | Campo resetado para `0` |
| BUG-06 | 🟡 MÉDIO | SyntaxError em `cli/commands/mcp.mjs` | `let args = {}` dentro de `cmdInvoke(args)` — redeclaração do parâmetro | Renomeado para `invokeArgs` |

### Estado de Limpeza

**Removidos:**
- 7 agentes zombie (zmb-aca1c940, zmb-a8e55c41, zmb-20ad976f, zmb-17bd1c08, zmb-4f403cf3, zmb-90630772, zmb-470e145e)
- 7 tarefas de orquestração (meta-tasks, duplicatas, tarefas bloqueadas)
- 5 arquivos órfãos (`nul`, `chat-modal.html`, `modal-conversa.html`, `test_session_endpoint.js`, `examples/`)
- Consensus.json limpo (`{"proposals":[]}`)

**Preservados (entregues válidos da sessão):**
- `cli/commands/mcp.mjs` — CLI para MCP (corrigido)
- `hive/consensus.mjs` + `hive/delegation.mjs` — módulos de governança
- `kilo-adapter/mcp-manager.mjs` — integração MCP
- `mcp-config.json` — configuração de servidores MCP
- `skills/mcp-control.yaml` — skill de controle MCP
- Modal `#modal-task-session` — visualização de sessão no kanban
- Expertise Matrix v4.1 — kimi-for-coding como primary

### Violações de Princípio

| Princípio Violado | Forma da Violação |
|---|---|
| P1 — Intenção | Múltiplas intenções executadas simultaneamente sem consolidação |
| P2 — Inflexão | Nenhum ponto de inflexão registrado durante a sessão |
| P3 — Molecular | Features grandes entregues em bloco, não em unidades verificáveis |
| P5 — Aprovação | Nenhuma aprovação solicitada antes de modificar estado persistido |
| P8 — Limpeza | 7 zombies e 7 tarefas órfãs deixados para trás |
| P10 — Sincronicidade | O que foi entregue divergiu significativamente do que foi intencionado |

### O que este evento nos ensinou

1. **Autonomia sem rastreabilidade é caos com boa intenção.** Os módulos eram válidos; a execução foi caótica.
2. **O DOM tem ordem.** Elementos referenciados em scripts devem existir antes da tag `<script>`.
3. **Kilo não usa `authed`, usa `connected`.** Nunca assumir — sempre verificar a resposta real.
4. **Windows CMD é frágil com UTF-8.** `chcp 65001` + `::` + Unicode = bomba.
5. **Race conditions são silenciosas.** O bug dos providers estava lá desde o início; só apareceu sob pressão.
6. **O Princípio 10 nasceu desta sessão.** Princípios emergem de falhas reais, não de teorias.

---

## 1.4 — INVENTÁRIO DE FEATURES — ESTADO VERIFICADO

### Core (Funcionando)

| Feature | Arquivo Principal | Notas |
|---|---|---|
| Dashboard SPA | `ui/index.html` | ~3200 linhas, JS verificado 731/731 braces |
| HTTP Server + WebSocket | `ui/server.mjs` | 1262 linhas, 21+ endpoints, RFC 6455 manual |
| Hive Management (CRUD agentes) | `ui/server.mjs` + `hive/agents.json` | 5 nativos pré-populados |
| Kanban Board (4 colunas) | `ui/index.html` + `kanban/tasks.json` | Backlog/Doing/Review/Done |
| Bulletin Board (9 tópicos) | `ui/index.html` + `bus/messages.jsonl` | Threads, filtros, tempo real |
| Chat com injeção de identidade | `kilo-adapter/` + `ui/index.html` | Soul + Skills + Character |
| Character Charts (RPG) | `characters/` + `ui/index.html` | 6 atributos, resistências, poder especial |
| Spawn de Zambias | `ui/index.html` + `ui/server.mjs` | Auto-close, lineage tree |
| CLI (mc.mjs) | `cli/mc.mjs` + `cli/commands/` | 6 grupos, REPL interativo |
| Episodic Memory | `memory/episodic.mjs` | Qdrant + Ollama + fallback JSON |
| Expertise Matrix | `expertise-matrix/matrix.yaml` | v4.1, kimi-for-coding primary |
| Boot Screen + Process Orchestrator | `start.mjs` | Boot animado, subsystem checks |
| Organic Growth | `ui/server.mjs` PATCH `/characters/:agent` | Bump de atributos via WS |
| Heartbeat + Zombie Detection | `ui/server.mjs` | >2min sem heartbeat → zombie |
| Modal de Sessão no Kanban | `ui/index.html` | 4 tabs: Mensagens/Reasoning/Código/Métricas |
| MCP Integration (parcial) | `kilo-adapter/mcp-manager.mjs` | Módulo pronto, não integrado ao runtime |
| Consensus/Delegation | `hive/consensus.mjs`, `hive/delegation.mjs` | Módulos prontos, não integrados |
| Sync Infrastructure | `sync-hmc.sh` + `.github/workflows/` | Dois repos em sincronia |

### Implementado mas não integrado ao runtime

| Feature | Arquivo | Bloqueio |
|---|---|---|
| MCP runtime | `kilo-adapter/mcp-manager.mjs` | Endpoints existem; UI não usa; integração pendente |
| Consensus runtime | `hive/consensus.mjs` | Sistema de votação pronto; nunca acionado |
| Recursive Delegation | `hive/delegation.mjs` | Lógica pronta; não conectada ao orchestrator |

---

## 1.5 — DÍVIDAS TÉCNICAS CONHECIDAS

| ID | Tipo | Descrição | Impacto | Sprint Alvo |
|---|---|---|---|---|
| DT-01 | Inconsistência | `soul` field: alguns agentes têm `"kilo-native"`, outros `"souls/kilo-native.yaml"` | Baixo (loader trata ambos) | S9 |
| DT-02 | Não integrado | MCP, consensus e delegation prontos mas não wired ao runtime | Médio (features incompletas) | S10 |
| DT-03 | Sem testes | Zero testes automatizados no projeto | Alto (detecta regressões tarde) | S11 |
| DT-04 | Ops sujos | `ops/events.jsonl` e `ops/state.json` não estão no .gitignore | Baixo (ruído no git) | S9 |
| DT-05 | Memory endpoint | `/api/agents/:id/memory` retorna null para todos os agentes nativos | Baixo (graceful degradation) | S10 |

---

## 1.6 — APROVAÇÕES FORMAIS REGISTRADAS

| Sprint | Data | Aprovador | Status |
|---|---|---|---|
| Sprints 1–6 | 2026-03-07 | Adilson | ✅ Aprovado |
| Sprint 7 (S7.1–S7.5) | 2026-03-07 | Adilson | ✅ Aprovado |
| Sprint 8 (S8.0–S8.4) | 2026-03-08 | Adilson (implícito via hotfix) | ✅ Aprovado |
| Hotfix Post-mortem | 2026-03-08 | Adilson ("RESOLVEU") | ✅ Aprovado |
| Sprint 9 | — | Adilson | 🟡 Pendente abertura |

---

# ═══════════════════════════════════════════════════
# PARTE II — ROADMAP DE LANÇAMENTO
# *Para onde vamos. Como chegamos lá. O que define "pronto".*
# ═══════════════════════════════════════════════════

> Esta seção é **orgânica e viva.** Evolui a cada sprint.
> Items são marcados com ✅ quando concluídos e aprovados.
> Novas descobertas, pivotadas e decisões são registradas aqui.

---

## 2.1 — VISÃO DE LANÇAMENTO

**O que estamos construindo para lançar:**
Um sistema de orquestração de agentes IA que qualquer equipe pode instalar, configurar com seus próprios providers e usar para colaboração humano-IA estruturada.

**Para quem:**
- Desenvolvedores e equipes que usam múltiplos provedores de IA (OpenAI, Anthropic, Kilo, etc.)
- Equipes que querem rastreabilidade e governança sobre uso de IA
- Pesquisadores que exploram orquestração multi-agente

**Critérios de lançamento** (o que define "pronto para produção"):
- [x] Sistema instalável com `npm run setup && npm start` (setup wizard entregue)
- [x] README bilíngue (entregue)
- [x] Zero referências hardcoded a Argenta/Adilson no código — movidas para `config/`
- [ ] Pelo menos 3 provedores de IA suportados e documentados
- [ ] Todos os fluxos principais com tratamento de erro visível
- [ ] CHANGELOG completo e legível
- [ ] Licença definida e incluída

---

## 2.2 — SPRINT 9 — FORK AGNÓSTICO ✅
### *Tornar o sistema instalável por qualquer pessoa*

> **Status:** ✅ ENTREGUE — 2026-03-08 · Aguardando aprovação formal
> **Branch master:** config externalizada, setup wizard, ops cleanup, soul paths padronizados
> **Branch generic:** forkada — config neutra, agentes genéricos, providers em branco

**Sub-sprints:**

- [x] **S9.1 — Limpeza de Ops** — `ops/events.jsonl` e `ops/state.json` no `.gitignore`; `.gitkeep`; `git rm --cached`
- [x] **S9.2 — Padronização de Soul paths** — DT-01 fechado: todos os 5 agentes agora com `"soul": "souls/kilo-native.yaml"`
- [x] **S9.3 — Orchestrator Config** — `config/orchestrator.json` com hive_name, orchestrator, operator, tagline, port, kilo_url
- [x] **S9.4 — Provider Config Externalizada** — `config/providers.json` com DISPLAY map; `GET /api/config` endpoint
- [x] **S9.5 — Setup Wizard** — `setup.mjs`: wizard interativo + detecção automática de providers Kilo; `npm run setup`
- [x] **S9.6 — Branch generic** — forkada de master; config genérica; agentes neutros (Coder/Planner/Debugger/Orchestrator/Researcher)
- [ ] **S9.7 — Aprovação S9** — aguardando

---

## 2.3 — SPRINT 10 — INTEGRAÇÃO REAL + WEB CLI
### *Runtime completo: MCP, consensus, delegation + terminal no browser*

> **Status:** ⬜ BACKLOG
> **Depende de:** Sprint 9 aprovado

**Sub-sprints:**

- [ ] **S10.1 — MCP Runtime Integration** — Conectar `mcp-manager.mjs` ao loop de runtime; UI para gerenciar servidores MCP ativos
- [ ] **S10.2 — Consensus Runtime** — Acionar `consensus.mjs` para decisões de alto impacto (ex: spawn em cascata, redirect de agente)
- [ ] **S10.3 — Delegation Runtime** — Conectar `delegation.mjs` ao Commander para delegação recursiva real
- [ ] **S10.4 — Web CLI** — Terminal xterm.js embedado no dashboard; executa `mc` commands via browser
- [ ] **S10.5 — Memory Endpoint** — Wiring real de `memory/episodic.mjs` com endpoint `/api/agents/:id/memory`
- [ ] **S10.6 — Scribe + Aprovação S10**

---

## 2.4 — SPRINT 11 — PLUGIN SYSTEM + TESTES
### *Extensibilidade e confiabilidade*

> **Status:** ⬜ BACKLOG
> **Depende de:** Sprint 10 aprovado

**Sub-sprints:**

- [ ] **S11.1 — Plugin System** — Skills e Souls instaláveis via `mc skill install <url>` / `mc soul install <url>`
- [ ] **S11.2 — Suite de Testes** — DT-03: testes de integração para endpoints críticos (providers, agents CRUD, kanban)
- [ ] **S11.3 — Multi-hive (PoC)** — Protocolo para dois Mission Controls se comunicarem (federação básica)
- [ ] **S11.4 — Health Dashboard** — Painel de saúde do sistema: uptime, latência Kilo, memória, eventos/min
- [ ] **S11.5 — Scribe + Aprovação S11**

---

## 2.5 — SPRINT 12 — HARDENING + LANÇAMENTO
### *Produção real. O que foi intencionado desde o início.*

> **Status:** ⬜ BACKLOG
> **Depende de:** Sprint 11 aprovado

**Sub-sprints:**

- [ ] **S12.1 — Security Audit** — Review de todos os endpoints; input sanitization; rate limiting básico
- [ ] **S12.2 — Performance Baseline** — Medir e documentar: tempo de boot, latência de WS, tempo de resposta de chat
- [ ] **S12.3 — Zambia Marketplace (PoC)** — Repositório público de souls + skills; `mc marketplace browse`
- [ ] **S12.4 — Screenshots + Demo** — Capturar todas as screenshots para `docs/assets/screenshots/`; vídeo demo (opcional)
- [ ] **S12.5 — Launch Checklist** — Verificar todos os critérios de lançamento da seção 2.1
- [ ] **S12.6 — Tag v1.0.0** — `git tag v1.0.0`; release notes; README final
- [ ] **S12.7 — Aprovação Final de Lançamento**

---

## 2.6 — CRITÉRIOS DE LANÇAMENTO — CHECKLIST VIVO

> Atualizar à medida que cada critério for cumprido.

### Técnicos
- [ ] Instalação em 5 minutos documentada e testada
- [ ] Zero dependências de infra obrigatória (Qdrant/Ollama são opcionais)
- [ ] Sem hardcoded `localhost` assumptions (configurável)
- [ ] Tratamento de erro visível em todos os fluxos principais
- [ ] CHANGELOG completo do v0.1 ao v1.0

### Produto
- [ ] README bilíngue com screenshots reais
- [ ] Vídeo demo ou GIF animado do dashboard
- [ ] Documentação de 3+ provedores suportados
- [ ] Guia de onboarding para novo usuário (HELP-HUMAN.md atualizado)

### Governança
- [ ] Licença definida (MIT / Apache 2.0 / outro)
- [ ] Código de conduta (CONTRIBUTING.md)
- [ ] Issue template no GitHub
- [ ] Processo de report de bugs documentado

---

## 2.7 — NOTAS VIVAS, PIVOTADAS E DECISÕES PENDENTES

> Esta é a seção mais orgânica. Registrar aqui: descobertas durante desenvolvimento, pivotadas de direção, decisões que precisam ser tomadas, dúvidas em aberto.

### 2026-03-08 — Sprint 9

**Estratégia de Desenvolvimento Quântico confirmada:** Duas branches coexistindo — `master` (Argenta, personalizada, lab vivo) e `generic` (produto público, agnóstico). Funcionalidades fluem de master → generic. Identidade nunca flui de volta.

**Aprendizado de onboarding:** O exercício de remover personalização revelou imediatamente as features necessárias: config wizard, auto-detecção de providers, display names configuráveis, port configurável. Cada hardcode removido = uma feature de onboarding descoberta.

**start-mc.bat:** Ainda Windows-only. Um `start.sh` para macOS/Linux é necessário para o produto genérico — adicionado implicitamente ao escopo do Sprint 10.

**Decisão pendente:** Licença do projeto — privada para uso da Argenta Fênix, ou open source? Impacta Sprints 11-12 significativamente.

**Descoberta:** Os módulos `consensus.mjs` e `delegation.mjs` foram implementados pela sessão autônoma mas nunca testados em runtime. Antes do Sprint 10, necessário validar que a lógica está correta.

**Pivotada confirmada:** Providers vêm do Kilo (live), nunca de fallback estático. A decisão do Sprint 8 (rejeitada pelo usuário e revertida) é agora princípio permanente (A4).

**Nota de arquitetura:** O `start-mc.bat` funciona em Windows mas não foi testado em macOS/Linux. Se a meta for produto agnóstico, um `start.sh` é necessário no Sprint 9.

---

*"De onde viemos informa para onde vamos. O que aprendemos é o que nos permite chegar lá."*

---
> launch_roadmap.md · Holistic Mission Control · Inaugurado 2026-03-08
> Parte I: imutável · Parte II: viva — atualizar a cada sprint
