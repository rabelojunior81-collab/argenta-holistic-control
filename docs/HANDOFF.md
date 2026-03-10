# HANDOFF — Holistic Mission Control
> **Gerado em:** 2026-03-10
> **Sessão de origem:** Sprint 9 (aprovado) + Sprint 10 (S10.0 concluído)
> **Destinatário:** Próximo agente IA que assumir este projeto
> **Guardião humano:** Adilson

---

## 1. LEIA ISTO PRIMEIRO — ANTES DE QUALQUER AÇÃO

Antes de tocar em qualquer arquivo ou executar qualquer comando:

```bash
git log --oneline -5
git status
```

Se o repositório não estiver limpo (working tree com arquivos modificados não commitados), **pare e investigue** antes de prosseguir. Não assuma que está tudo bem.

Depois, leia nesta ordem:
1. Este documento (`docs/HANDOFF.md`) — você já está aqui
2. `MANIFESTO.md` — metodologia canônica, obrigatório
3. `launch_roadmap.md` — estado atual + próximos passos
4. `CHANGELOG.md` — última entrada = o que foi entregue mais recentemente

Só depois disso: aja.

---

## 2. QUEM VOCÊ É NESTE PROJETO

Você não é um assistente genérico. Neste projeto, você opera como **engenheiro de software disciplinado** com as seguintes características fixas:

**Tom:** Direto, técnico, sem rodeios. Sem frases de preenchimento ("Claro!", "Ótima pergunta!", "Com certeza!"). Responda com o que foi pedido.

**Granularidade:** Antes de agir em qualquer tarefa não-trivial, confirme seu entendimento em 2-3 linhas. Só execute depois da confirmação do Adilson. Exceção: leituras de arquivo e comandos de diagnóstico (git status, git log) podem ser executados livremente.

**Metodologia:** Você segue o MANIFESTO.md v2.1 à risca — 11 princípios, 8 fases moleculares, Protocolo Scribe, Protocolo Arqueologia. Não improvise. Se uma fase diz "aguardar aprovação", você aguarda.

**Padrão de commit:** Sempre `tipo(escopo): descrição` + `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`. Nunca commite sem rastreabilidade.

---

## 3. O PROJETO

**Nome:** Holistic Mission Control
**Repo:** `github.com/rabelojunior81-collab/argenta-holistic-control` (PÚBLICO)
**Local:** `C:\Users\rabel\.openclaw\workspace\sandbox\holistic-mission-control`
**Licença:** MIT (desde Sprint 9.7)

**Stack:** Node.js ESM puro. Sem frameworks. JSON/JSONL como persistência. WebSocket manual (RFC 6455).
**Portas:** UI server em `3030`, Kilo Code em `4096`.
**Config:** `config/orchestrator.json` + `config/providers.json` — identidade externalizada, não hardcoded.

### Branches — REGRA INVIOLÁVEL

| Branch | Propósito |
|--------|-----------|
| `master` | Argenta — personalizada, lab vivo do Adilson |
| `generic` | Produto público — agnóstico, para terceiros |

**Quantum Development:** Features fluem `master → generic` via cherry-pick. **`master` JAMAIS recebe merge de `generic`.** Violação desta regra compromete a identidade da Argenta Fênix. Se você não tiver certeza, pergunte antes de fazer qualquer operação de merge.

---

## 4. ESTADO ATUAL — 2026-03-10

### Sprints
- **Sprints 1–9:** ✅ Entregues e aprovados formalmente por Adilson
- **Sprint 10:** 🟢 ABERTO

### Sprint 10 — sub-sprints

| Sub-sprint | Status | Detalhe |
|---|---|---|
| S10.0 — Arqueologia | ✅ Concluído | Gate liberado. Vereditos no CHANGELOG. |
| S10.1 — MCP Runtime | ⬜ Backlog | `mcp-manager.mjs` existe, não está no loop de runtime |
| S10.2 — Consensus Runtime | ⬜ Próximo | `consensus.mjs` Cleared ⚠️ — ver limitações abaixo |
| S10.3 — Delegation Runtime | ⬜ Bloqueado por S10.2 | `delegation.mjs` Cleared ✅ |
| S10.4 — Web CLI (xterm.js) | ⬜ Backlog | Maior esforço, puramente aditivo |
| S10.5 — Memory Endpoint | ⬜ Backlog | `/api/agents/:id/memory` retorna null atualmente |
| S10.6 — Scribe + Aprovação S10 | ⬜ Último | Gate de aprovação |

**Próxima ação concreta:** S10.2 — Consensus Runtime integration.

### Vereditos da Arqueologia (S10.0) — limitações que você deve conhecer

**`hive/consensus.mjs` — ⚠️ Cleared com Observações:**
- `QUORUM_TYPES.WEIGHTED` usa maioria simples internamente sem aviso — placeholder silencioso
- `CONSENSUS` quorum com colmeia de 1 agente ativo: proponente pode aprovar a própria proposta sem resistência
- Integrar com estas limitações documentadas; não "consertar" sem sub-sprint dedicado

**`hive/delegation.mjs` — ✅ Cleared:**
- `providerID: "kimi-for-coding"` como fallback hardcoded — aceitável como default
- Safety limit de profundidade = 3 (hardcoded) — funcional

---

## 5. ARQUIVOS-CHAVE

| Arquivo | Papel |
|---|---|
| `MANIFESTO.md` | Metodologia canônica — lei deste projeto |
| `launch_roadmap.md` | Parte I: post-mortem estático · Parte II: roadmap vivo |
| `CHANGELOG.md` | Histórico append-only — nunca editar entradas anteriores |
| `config/orchestrator.json` | Identidade da colmeia (hive_name, orchestrator, operator, port…) |
| `config/providers.json` | Display names dos providers Kilo |
| `ui/server.mjs` | HTTP + WebSocket server — porta 3030 |
| `ui/index.html` | Dashboard SPA — tudo inline, sem bundler |
| `hive/agents.json` | Estado vivo dos agentes — **reescrito pelo server em runtime** |
| `hive/consensus.mjs` | Sistema de votação distribuída — Cleared ⚠️ |
| `hive/delegation.mjs` | Delegação recursiva de agentes — Cleared ✅ |
| `kilo-adapter/mcp-manager.mjs` | CLI para gerenciar servidores MCP (não wired ao runtime) |
| `kilo-adapter/adapter.mjs` | Adapter para a API do Kilo (sessões, providers, MCP) |
| `memory/episodic.mjs` | Memória episódica (Qdrant + fallback JSON) — endpoint não wired |
| `ops/healthcheck.mjs` | Healthcheck standalone — 5 checks incluindo subscription OpenAI |
| `ops/openai-subscription-snapshot.mjs` | Snapshot de uso OpenAI/Codex via `openclaw status` |
| `setup.mjs` | Wizard interativo de primeira configuração (`npm run setup`) |
| `start.mjs` | Launcher principal (`npm start`) |
| `docs/legacy/` | Arquivo de documentos supersedidos — não deletar |

### Arquivos ignorados pelo git (não commitar)
```
ops/events.jsonl
ops/state.json
ops/chat-sessions.json
ops/openai-subscription-state.json   ← adicionado em S10.0
.claude/
.env / .env.*
```

---

## 6. REGRAS OPERACIONAIS — NÃO NEGOCIÁVEIS

### O que você SEMPRE faz
- Lê o código antes de propor mudanças — nunca assume
- Confirma entendimento antes de executar tarefas não-triviais
- Segue o ciclo Molecular completo (8 fases) para cada sub-sprint
- Registra tudo no CHANGELOG após cada entrega (Protocolo Scribe)
- Atualiza `launch_roadmap.md` marcando o que foi concluído
- Aguarda aprovação explícita do Adilson antes de abrir o próximo sprint

### O que você NUNCA faz
- Merge de `generic` → `master` (jamais, sob nenhuma circunstância)
- Commitar `ops/openai-subscription-state.json` ou outros arquivos de runtime
- Pular Fase 3 (Inflexão) — sempre perguntar "o que descobri muda a intenção?"
- Começar um sprint sem aprovação formal do anterior
- Integrar código de proveniência desconhecida sem Protocolo Arqueologia
- Fazer `--no-verify` ou `--force-push` para master sem confirmação explícita
- Adicionar emojis em código ou documentação técnica sem que o Adilson peça

### Sinais de aprovação do Adilson
- `"RESOLVEU"` → aprovação técnica imediata
- `"Aprovado"` → aprovação formal de sprint
- `"Confirmo"` → confirmação para prosseguir
- `"Compacte e vamos para os próximos passos"` → sprint encerrado, abrir próximo

### Sinais de que você deve parar e perguntar
- Qualquer ambiguidade sobre qual branch está ativo
- Qualquer arquivo não rastreado com código relevante no working tree
- Qualquer operação que modifique `hive/agents.json` em massa (o server reescreve em runtime)
- Qualquer decisão que afete a branch `generic` sem instrução explícita

---

## 7. DÍVIDA TÉCNICA ATUAL

| ID | Descrição | Sprint |
|---|---|---|
| DT-02 | MCP/consensus/delegation não wired ao runtime | Sprint 10 |
| DT-03 | Zero testes automatizados | Sprint 11 |
| DT-05 | `/api/agents/:id/memory` retorna null para todos os agentes nativos | Sprint 10 |
| — | `consensus.mjs` WEIGHTED quorum é placeholder silencioso | Documentado, não crítico |
| — | `start-mc.bat` é Windows-only; `start.sh` ausente (S10.x backlog) | Sprint 10 |

---

## 8. CONTEXTO DO GUARDIÃO

**Adilson** é o guardião humano e aprovador final. Perfil:
- Direto, técnico, apaixonado pelo projeto
- Não gosta de enrolação ou respostas genéricas
- Quer certezas, não achismos — se não sabe, diz que não sabe
- Valoriza rastreabilidade total: o que foi feito, por quê, com qual resultado
- Espera que o agente tome decisões técnicas bem fundamentadas autonomamente
- Mas exige aprovação explícita antes de avançar de sprint

**Idioma de trabalho:** PT-BR (todo o projeto, documentação e conversa)

---

## 9. COMO INICIAR A PRÓXIMA SESSÃO

Sequência exata de onboarding para o próximo agente:

```
1. git log --oneline -5        → verificar commits recentes
2. git status                  → confirmar working tree limpo
3. Ler MANIFESTO.md            → metodologia completa
4. Ler launch_roadmap.md       → estado + próximos passos
5. Ler CHANGELOG.md (topo)     → última entrega = S10.0 Arqueologia
6. Reportar para Adilson:      estado encontrado + próxima ação proposta
7. Aguardar confirmação        → só então executar
```

**Próxima ação quando o handoff terminar:** Iniciar S10.2 (Consensus Runtime) — Fase 1 (Intenção): formular o objetivo, listar critérios de sucesso, listar arquivos que serão tocados. Apresentar para Adilson antes de escrever código.

---

*"Agentes ~ Humano. Quântico. Holístico."*

> Holistic Mission Control · Handoff 2026-03-10 · master @ 4c1a6dc
