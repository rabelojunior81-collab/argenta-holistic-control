# docs/legacy — Arquivo Histórico

> **Status:** Congelado. Leitura permitida. Nenhuma edição deve ser feita aqui.
> **Propósito:** Fonte de conhecimento histórico. Decisões passadas, planos originais, arquiteturas exploradas e experimentos que moldaram o que o projeto é hoje.

---

## Por que este diretório existe?

Em 2026-03-08, ao abrir a fase de lançamento (Sprint 9+), o ambiente foi limpo e realinhado à nova missão.
Os documentos abaixo foram **superados** — não porque estavam errados, mas porque cumpriram seu papel.
Preservá-los aqui é respeitar a história e manter a rastreabilidade intelectual do projeto.

> *"Limpando o Ambiente para a nova Missão — respeitando a história, conservando o conhecimento."*

---

## Índice

| Arquivo | O que é | Por que foi arquivado |
|---|---|---|
| `HIVE_BLUEPRINT.md` | Arquitetura original da colmeia (v0.1, 2026-03-05). Blueprint dos Sprints 1–6. | Explicitamente marcado como "congelado" no próprio arquivo. Substituído por `ARCHITECTURE.md`. |
| `HIVE_GROWTH_PROTOCOL.md` | Protocolo de crescimento da colmeia com checklists de Sprints 1–8, metodologia molecular v1, Princípios P1–P10. | Sprint 8 concluído. Metodologia absorvida e elevada em `MANIFESTO.md`. Histórico de sprints preservado aqui. |
| `SYNC.md` | Documentação da infraestrutura de sincronização entre dois repositórios (workspace ↔ standalone). | Operacional, mas pertence ao contexto da fase anterior. O fluxo de sync é implícito na nova fase. |
| `MCP.md` | Documentação do Model Context Protocol — gerada pela sessão de orquestração autônoma (2026-03-07). | Parcialmente implementado. Referência técnica válida para reimplementação futura em Sprint 11+. |
| `RECURSIVE_DELEGATION_AND_CONSENSUS.md` | Especificação do sistema de delegação recursiva e votação por consenso — gerado autonomamente. | Módulos implementados (`consensus.mjs`, `delegation.mjs`) mas não integrados ao runtime. Roadmap Sprint 10+. |

---

## Como usar este arquivo

- **Procurando a arquitetura original?** → `HIVE_BLUEPRINT.md`
- **Procurando o histórico completo de sprints?** → `HIVE_GROWTH_PROTOCOL.md`
- **Procurando spec técnica de MCP?** → `MCP.md`
- **Procurando spec de consensus/delegation?** → `RECURSIVE_DELEGATION_AND_CONSENSUS.md`
- **Procurando a metodologia atual?** → `/MANIFESTO.md` (raiz do projeto)

---

*Arquivado em 2026-03-08 · Holistic Mission Control v1.0 → v2.0 transition*
