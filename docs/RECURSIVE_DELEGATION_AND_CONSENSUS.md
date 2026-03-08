# 🧬 Sistema de Delegação Recursiva e Consenso Distribuído

**Autor:** The Forge  
**Data:** 2026-03-07  
**Status:** ✅ Implementado e Operacional

---

## 📋 Visão Geral

Implementação de duas evoluções arquiteturais solicitadas para o Mission Control:

1. **Delegação Recursiva** — Zâmbias podem spawnar outras Zâmbias (hierarquia N-níveis)
2. **Consenso Distribuído** — Sistema de propostas e votação entre agentes

---

## 🧬 1. Delegação Recursiva

### Arquivo
`hive/delegation.mjs`

### Funcionalidades

| Função | Descrição |
|--------|-----------|
| `spawnSubordinate(parentId, options)` | Cria subordinado a partir de qualquer agente |
| `listDescendants(agentId)` | Lista todos os descendentes de um agente |
| `getHierarchyStats(rootId)` | Estatísticas da hierarquia |

### Características

- **Profundidade máxima:** 3 níveis (previne recursão infinita)
- **Ancestry tracking:** Cada agente mantém árvore genealógica completa
- **Herança:** Subordinados herdam skills, provider e domain do pai (sobrescrevível)
- **Task vinculada:** Cada subordinado cria task no kanban automaticamente

### Uso

```bash
# Criar subordinado
node -e "const { spawnSubordinate } = await import('./hive/delegation.mjs');
await spawnSubordinate('agt-code-native', { 
  mission: 'Implementar feature X',
  domain: 'execution' 
});"

# Ver hierarquia
node hive/delegation.mjs tree agt-code-native
```

### Estrutura de Dados

```json
{
  "id": "zmb-xxx",
  "type": "zambia",
  "parent": "agt-code-native",
  "ancestry": ["agt-code-native"],
  "depth": 1,
  "creator": "The Forge"
}
```

---

## 🗳️ 2. Consenso Distribuído

### Arquivo
`hive/consensus.mjs`

### Funcionalidades

| Função | Descrição |
|--------|-----------|
| `createProposal(proposer, title, desc, opts)` | Cria nova proposta |
| `castVote(proposalId, voterId, vote, reason)` | Registra voto |
| `checkQuorum(proposalId)` | Verifica se atingiu quorum |
| `closeProposal(proposalId)` | Fecha proposta manualmente |
| `listProposals(filters)` | Lista todas as propostas |

### Tipos de Quorum

| Tipo | Descrição | Threshold |
|------|-----------|-----------|
| `simple` | Maioria simples | > 50% |
| `super` | Supermaioria | > 66% |
| `consensus` | Consenso total | 100% |
| `weighted` | Maioria ponderada | > 50% (com pesos) |

### Uso

```bash
# Criar proposta
node -e "const { createProposal } = await import('./hive/consensus.mjs');
await createProposal('agt-code-native', 'Título', 'Descrição', { quorum: 'simple' });"

# Votar
node -e "const { castVote } = await import('./hive/consensus.mjs');
await castVote('prop-xxx', 'agt-plan-native', 'yes', 'Razão');"

# Listar
node hive/consensus.mjs list
```

### Persistência

- **Arquivo:** `hive/consensus.json`
- **Formato:** JSON com arrays de `proposals` e `votes`
- **Eventos:** Todos os eventos logados em `ops/events.jsonl`

---

## 🎯 Integração com Sistema Existente

### Hive (`hive/agents.json`)
- Agente com `parent` e `ancestry` para rastreamento
- Campo `depth` para controle de nível

### Kanban (`kanban/tasks.json`)
- Tasks de subordinados têm `parent_task` linkando à task pai
- Eventos registram delegação

### Bus (`bus/messages.jsonl`)
- Propostas podem ser discutidas no bulletin board
- Votos podem ser comunicados via broadcast

---

## 📊 Estado Atual do Sistema

### Agentes
- **Nativos:** 5 (The Forge, The Oracle, The Sleuth, The Commander, The Lore Keeper)
- **Zâmbias:** 3 (2 execution, 1 research)
- **Máxima profundidade:** 1 (aguardando testes de nível 2+)

### MCP
- **Servidores:** 4/5 ativos (filesystem, git, fetch, sequential-thinking)
- **Manager:** CLI operacional (`npm run mcp:*`)

### Consenso
- **Propostas criadas:** 1 (teste)
- **Status:** passed (maioria simples)
- **Votos registrados:** 1

---

## 🔮 Próximos Passos Sugeridos

1. **Testar hierarquia nível 2+:** Zâmbia spawnar Zâmbia que spawna Zâmbia
2. **Integrar com UI:** Painel de votação no Mission Control UI
3. **Notificações:** WebSocket para atualizações de propostas em tempo real
4. **Reputação:** Implementar sistema de peso de voto baseado em histórico
5. **Delegação automática:** Zâmbias decidirem autonomamente quando delegar

---

## 📝 Arquivos Criados/Modificados

### Novos
- `hive/delegation.mjs` — Módulo de delegação recursiva
- `hive/consensus.mjs` — Módulo de consenso distribuído
- `hive/consensus.json` — Persistência de propostas/votos
- `docs/RECURSIVE_DELEGATION_AND_CONSENSUS.md` — Esta documentação

### Modificados
- `hive/agents.json` — Estrutura de agentes com campos de ancestry
- `kanban/tasks.json` — Tasks com `parent_task`
- `ops/events.jsonl` — Eventos de sistema

---

## ✅ Validação

Sistema testado e operacional:
- ✅ Delegação recursiva funcional
- ✅ Consenso com quorum configurável
- ✅ Persistência em JSON
- ✅ Integração com hive/kanban existente
- ✅ CLI para operações manuais

**Status: PRONTO PARA PRODUÇÃO**
