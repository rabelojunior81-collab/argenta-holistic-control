# MANIFESTO — Holistic Mission Control
### Metodologia Canônica de Desenvolvimento

> **Versão:** 2.1 — 2026-03-08
> **Status:** ◉ VIVO — Revisitado a cada sprint. Nunca congelado.
> **Guardião:** Adilson (humano) + Argenta (IA orquestradora)
> **Princípio-guia:** *Máxima sincronicidade entre intenção e entrega.*

---

## I. IDENTIDADE E MISSÃO

**Holistic Mission Control** não é uma ferramenta. É um sistema nervoso central para orquestração humano-IA — construído com a convicção de que a colaboração entre inteligência humana e artificial, quando estruturada com intenção clara, produz resultados que nenhuma das partes alcançaria sozinha.

**A missão:** capacitar a Argenta Fênix e seus operadores humanos a orquestrar colmeias de agentes inteligentes com clareza, autonomia responsável e rastreabilidade completa.

**A filosofia em três palavras:**

```
  HOLÍSTICO · QUÂNTICO · VIVO
```

- **Holístico:** Cada componente existe em relação ao todo. Código, documentação, agentes, humanos — um ecossistema integrado, não partes isoladas.
- **Quântico:** Agentes e humanos operam em superposição de intenções até o momento da decisão. A observação colapsa a possibilidade em entrega.
- **Vivo:** O sistema evolui. A metodologia evolui. O que não evolui, morre.

---

## II. OS DEZ PRINCÍPIOS

> Princípios não são regras. São forças que atuam sobre cada decisão.
> Violá-los não é proibido — é custoso. O custo deve ser consciente.

### P1 — Intenção Antes da Execução
Toda ação começa com intenção explícita. Nenhum código é escrito, nenhum agente é spawnado, nenhuma feature é entregue sem que a intenção tenha sido formulada, escrita e reconhecida. A intenção é o contrato entre quem pede e quem entrega.

### P2 — Inflexão como Momento Sagrado
Entre pesquisa e execução existe um ponto de inflexão: o momento em que o que foi descoberto pode mudar o que foi planejado. Este momento deve ser reconhecido, verbalizado e aprovado. Pular a inflexão é o erro mais comum e o mais caro.

### P3 — Molecular: Pequeno, Completo, Verificável
Cada unidade de trabalho deve ser pequena o suficiente para ser verificada por inteiro, e completa o suficiente para ter valor próprio. Features parciais entregues como completas são dívida técnica disfarçada de progresso.

### P4 — Scribe como Cidadão de Primeira Classe
Documentação não é opcional, não é posterior, não é bônus. Documentação é parte da entrega. Um sub-sprint de código sem documentação correspondente está incompleto. O Protocolo Scribe define o mínimo aceitável.

### P5 — Aprovação Explícita, Nunca Implícita
Nenhum sprint começa sem aprovação formal do anterior. Aprovação implícita ("parece que está tudo certo") não conta. A aprovação é um ato consciente, registrado, com nome e data.

### P6 — Autonomia com Prestação de Contas
Agentes autônomos têm permissão para explorar, experimentar e propor. Mas toda ação que modifica estado persistido (arquivos, agentes, tarefas) requer rastreabilidade. Autonomia sem rastreabilidade é caos com boa intenção.

### P7 — Degradação Graciosa, Nunca Falha Silenciosa
O sistema deve degradar com elegância quando dependências falham (Kilo offline, Qdrant ausente, sessão expirada). Falha silenciosa é o inimigo da confiança. Quando algo falha, o sistema deve dizer claramente o que falhou e como operar sem ele.

### P8 — Limpeza como Obrigação, não Opção
Quem cria caos é responsável pela limpeza. Agentes que spawnam zombies, criam tarefas órfãs ou corrompem estado devem limpar antes de encerrar. Estado sujo é dívida coletiva — compromete toda a colmeia.

### P9 — Versionamento Semântico de Conhecimento
Documentos evoluem com APPEND/EVOLVE/MARK — nunca com DELETE/OVERWRITE silencioso. O histórico de intenções é tão valioso quanto o código. Arquivar é diferente de apagar. `docs/legacy/` existe por princípio.

### P10 — Sincronicidade como Métrica Final
A única métrica que importa: **quão próximo o que foi entregue está do que foi intencionado?** Velocidade, quantidade de features, linhas de código — secundários. Sincronicidade entre intenção e entrega é o norte.

### P11 — Proveniência como Pré-requisito de Integração
Todo código tem uma origem. Código escrito dentro do ciclo Molecular supervisionado tem proveniência conhecida. Código vindo de fora — sessão autônoma, contribuição externa, legado sem autor claro — tem proveniência desconhecida e **não pode ser integrado sem arqueologia prévia.** Integrar código de proveniência desconhecida sem auditoria é o equivalente a aceitar código sem revisão: pode funcionar, pode não funcionar, e quando falhar, o custo de diagnóstico será alto. O Protocolo Arqueologia define o procedimento.

---

## III. METODOLOGIA MOLECULAR — AS 8 FASES

> Cada sprint, cada sub-sprint, cada tarefa passa por este ciclo.
> Fases podem ser rápidas (30 segundos de reflexão) ou longas (horas de pesquisa).
> O que não pode é ser pulada.

```
  ┌─────────────────────────────────────────────────────┐
  │                  CICLO MOLECULAR                    │
  │                                                     │
  │   1. INTENÇÃO    →   2. PESQUISA   →   3. INFLEXÃO  │
  │        ↑                                    ↓       │
  │   8. APROVAÇÃO   ←   7. VALIDAÇÃO  ←  4. CONSOLIDAÇÃO│
  │                                            ↓       │
  │                   6. TESTE    ←    5. EXECUÇÃO      │
  └─────────────────────────────────────────────────────┘
```

### Fase 1 — INTENÇÃO
*O quê e o porquê, antes do como.*
- Formular o objetivo em linguagem natural (1-3 frases)
- Identificar o domínio (backend / frontend / CLI / config / docs)
- Listar os critérios de sucesso verificáveis
- Registrar quem aprovou a intenção

### Fase 2 — PESQUISA
*Entender o que existe antes de criar o que não existe.*
- Ler o código relevante (não assumir, ler)
- Identificar dependências e pontos de integração
- Mapear riscos e ambiguidades
- Documentar descobertas relevantes (podem mudar a intenção)
- **Gate de proveniência:** Se qualquer código a integrar vier de fora do ciclo Molecular supervisionado → acionar **Protocolo Arqueologia** antes de prosseguir para a Fase 3

### Fase 3 — INFLEXÃO
*O momento mais valioso do ciclo.*
- Pergunta obrigatória: "O que descobri na pesquisa muda a intenção original?"
- Se SIM → voltar à Fase 1 com nova intenção (não pular este retorno)
- Se NÃO → confirmar explicitamente e seguir para Consolidação
- Registrar a conclusão da inflexão (mesmo que seja "intenção mantida")

### Fase 4 — CONSOLIDAÇÃO
*O plano concreto, antes do primeiro keystroke.*
- Listar os sub-sprints (unidades moleculares de trabalho)
- Definir ordem de execução e dependências
- Identificar arquivos que serão tocados
- Definir o estado esperado ao final de cada sub-sprint

### Fase 5 — EXECUÇÃO
*Uma unidade molecular de cada vez.*
- Executar um sub-sprint por vez
- Não iniciar o próximo antes de verificar o atual
- Registrar decisões de implementação não-óbvias
- Sinalizar bloqueios imediatamente (não tentar resolver silenciosamente)

### Fase 6 — TESTE
*Verificação antes da celebração.*
- Testar o que foi implementado contra os critérios de sucesso da Fase 1
- Testes devem ser honestos: o que não funciona deve ser reportado
- Identificar edge cases e comportamentos inesperados
- Documentar o resultado dos testes

### Fase 7 — VALIDAÇÃO
*O Scribe entra em cena.*
- Atualizar documentação afetada (ARCHITECTURE.md, HELP-AI.md, HELP-HUMAN.md)
- Adicionar entrada no CHANGELOG.md
- Atualizar launch_roadmap.md (marcar itens concluídos, adicionar descobertas)
- Verificar que nenhum estado sujo ficou para trás (zombies, tarefas órfãs, arquivos temp)

### Fase 8 — APROVAÇÃO
*O contrato de entrega.*
- Apresentar o que foi entregue contra o que foi intencionado (Fase 1)
- Aguardar aprovação explícita do guardião humano
- Registrar aprovação com data e versão
- Somente após aprovação: o próximo sprint pode ser iniciado

---

## IV. PROTOCOLO SCRIBE

> *"Se não foi documentado, não foi entregue."*

O Protocolo Scribe define o mínimo de documentação para cada tipo de entrega:

### Por tipo de mudança:

| Tipo | CHANGELOG | ARCHITECTURE | HELP-AI | HELP-HUMAN | launch_roadmap |
|---|:---:|:---:|:---:|:---:|:---:|
| Nova feature backend | ✅ | ✅ | ✅ | — | ✅ |
| Nova feature frontend | ✅ | — | ✅ | ✅ | ✅ |
| Bug fix crítico | ✅ | — | — | — | — |
| Novo agente/soul/skill | ✅ | — | ✅ | ✅ | — |
| Mudança arquitetural | ✅ | ✅ | ✅ | ✅ | ✅ |
| Novo endpoint | ✅ | ✅ | ✅ | — | — |
| Refactor sem mudança de comportamento | ✅ | — | — | — | — |

### Operações de documento:

- **APPEND** — adiciona nova seção sem alterar existentes (preferida)
- **EVOLVE** — atualiza seção existente preservando intenção original (anota o que mudou)
- **MARK** — marca algo como obsoleto/arquivado sem deletar
- **NEVER DELETE** — histórico documental é irrecuperável; mover para `docs/legacy/` se necessário

### Formato de entrada no CHANGELOG:

```markdown
## [Sprint X.Y] — Título — YYYY-MM-DD
### Entregue
- Item entregue com resultado verificável

### Decisões
- Decisão tomada e seu racional

### Problemas
- Problema encontrado e como foi resolvido

### Pendente
- O que ficou para o próximo sprint e porquê
```

---

## IV-B. PROTOCOLO ARQUEOLOGIA

> *"Código sem autor verificado é uma promessa sem assinatura."*

O Protocolo Arqueologia é ativado quando um sprint precisa integrar código de **proveniência não-Molecular** — escrito fora do ciclo supervisionado. Substitui a Fase 2 (Pesquisa) padrão para esses módulos.

### Gatilho

Acionar quando o código a integrar se encaixa em qualquer categoria:

| Categoria | Exemplos |
|---|---|
| **Sessão autônoma** | IA rodando sem supervisão humana (ex: `[BREAK]` no histórico) |
| **Contribuição externa** | PR de terceiro, código de fork, snippet de fora do projeto |
| **Legado sem rastreio** | Módulo sem entrada no CHANGELOG, sem autor identificável |
| **IA sem revisão** | Código gerado por IA e aceito sem leitura linha a linha |

### Procedimento

**Etapa 1 — Inventário**
- Listar todos os arquivos afetados pelo sprint que têm proveniência desconhecida
- Confirmar que cada arquivo está no CHANGELOG ou explicar por que não está

**Etapa 2 — Leitura Forense**
- Ler cada arquivo linha a linha (não skimming)
- Para cada função/método: o comportamento declarado no nome corresponde ao que o código faz?
- Identificar: side effects não-óbvios, estado mutado silenciosamente, dependências ocultas, dead code

**Etapa 3 — Teste de Isolamento**
- Executar o módulo de forma isolada, sem conectar ao runtime principal
- Verificar: entradas esperadas → saídas esperadas
- Documentar qualquer comportamento que diverge do que o nome/comentário promete

**Etapa 4 — Veredito**

| Veredito | Critério | Próximo passo |
|---|---|---|
| ✅ **Cleared** | Comportamento confirmado, sem surpresas | Prosseguir com integração normal |
| ⚠️ **Cleared com Observações** | Funciona, mas com edge cases ou código confuso | Integrar + documentar limitações conhecidas |
| 🔁 **Refatorar Antes** | Lógica correta, estrutura problemática | Refatorar em sub-sprint dedicado antes da integração |
| ❌ **Reescrever** | Comportamento incorreto ou lógica ininteligível | Descartar e reescrever dentro do ciclo Molecular |

**Etapa 5 — Relatório**
- Registrar veredito por módulo no CHANGELOG (entrada `[Arqueologia]`)
- Atualizar `launch_roadmap.md` com o gate concluído
- Somente após relatório: o sprint de integração pode iniciar (Fase 3 em diante)

### Exemplo de entrada no CHANGELOG

```markdown
## [Arqueologia — consensus.mjs + delegation.mjs] — YYYY-MM-DD
### Proveniência
- Escritos em sessão autônoma [BREAK] 2026-03-07 — sem supervisão humana

### Veredito
- `consensus.mjs`: ⚠️ Cleared com Observações — lógica de votação correta, mas timeout não configurável
- `delegation.mjs`: ✅ Cleared — comportamento conforme esperado

### Limitações documentadas
- `consensus.mjs` assume 3+ agentes; com 1-2 agentes, fallback não está implementado
```

---

## V. CRITÉRIOS DE QUALIDADE

### O que torna uma entrega ACEITÁVEL:
- [ ] Critérios de sucesso da Fase 1 atendidos
- [ ] Nenhum estado sujo deixado para trás
- [ ] Documentação Scribe mínima atualizada
- [ ] Sem regressões em features existentes
- [ ] Código legível para um humano sem contexto prévio

### O que torna uma entrega EXCELENTE:
- [ ] Sincronicidade total com a intenção original
- [ ] Edge cases documentados ou tratados
- [ ] Performance dentro do esperado
- [ ] Documentação que antecipa perguntas futuras
- [ ] Deixou o ambiente mais limpo do que encontrou

### O que torna uma entrega REPROVADA:
- [ ] Feature incompleta entregue como completa
- [ ] Estado corrompido ou zombie deixado para trás
- [ ] Documentação não atualizada
- [ ] Regressão em feature existente
- [ ] Intenção original não atendida sem justificativa

---

## VI. META-AVALIAÇÃO — REVISITANDO O PRÓPRIO MANIFESTO

> *O manifesto que não se auto-avalia se torna dogma.*

Este documento deve ser revisitado a cada **3 sprints** ou quando:
- Uma entrega falha de forma inesperada
- Uma nova tensão é identificada entre princípios
- Uma complexidade de documentação está impedindo agilidade
- Uma simplificação óbvia se apresenta

### Perguntas de revisão:

1. **Os 10 princípios ainda refletem como trabalhamos de fato?**
2. **As 8 fases estão sendo seguidas ou contornadas? Por quê?**
3. **O Protocolo Scribe está gerando documentação útil ou burocracia?**
4. **A métrica de sincronicidade está sendo medida de alguma forma?**
5. **Algum princípio deve ser adicionado com base em aprendizados recentes?**
6. **Algum princípio deve ser removido ou simplificado?**

### Histórico de revisões:

| Versão | Data | O que mudou | Por quê |
|---|---|---|---|
| 1.0 | 2026-03-05 | Princípios P1–P9, Metodologia Molecular inicial | Sprint 1, blueprint original |
| 1.x | 2026-03-07 | P10 adicionado (Limpeza como Obrigação) | Post-mortem sessão autônoma |
| 2.0 | 2026-03-08 | Manifesto reescrito limpo, elevado como canônico | Abertura da fase de lançamento (Sprint 9+) |
| 2.1 | 2026-03-08 | P11 adicionado; Protocolo Arqueologia (IV-B); gate na Fase 2 | Abertura Sprint 10: herança de código autônomo sem proveniência |

---

## VII. GLOSSÁRIO

| Termo | Definição |
|---|---|
| **Colmeia** | O conjunto de todos os agentes ativos sob o Mission Control |
| **Agente nativo** | Agente permanente com identidade fixa (The Forge, Oracle, Sleuth, Commander, Lore Keeper) |
| **Zambia** | Agente temporário spawnado para uma missão específica; auto-fecha ao completar |
| **Soul** | Template de persona injetado como system prompt (tom, diretrizes, restrições) |
| **Skill** | Enhancement de prompt modular, adicionado à soul para capacidades específicas |
| **Kilo** | Kilo Code — o substrato LLM que executa os agentes (porta 4096) |
| **Argenta** | A orquestradora central (IA) — queen da colmeia |
| **Adilson** | O guardião humano — aprovador final, norte da intenção |
| **Inflexão** | Momento entre pesquisa e execução onde a intenção pode ser revisada |
| **Molecular** | Unidade mínima de trabalho — pequena, completa e verificável |
| **Scribe** | O papel de documentador — pode ser humano ou IA, mas sempre presente |
| **Zombie** | Agente sem heartbeat por >2min — sinal de dívida técnica ou falha de orquestração |
| **Consensus** | Sistema de votação distribuída entre agentes para decisões de alto impacto |
| **Sincronicidade** | Grau de alinhamento entre intenção declarada e entrega realizada |
| **Arqueologia** | Auditoria forense de código de proveniência desconhecida antes de integração |
| **Proveniência** | Origem rastreável de um módulo: quem escreveu, quando, dentro de qual ciclo |
| **Cleared** | Veredito do Protocolo Arqueologia: módulo aprovado para integração |

---

*"Agentes ~ Humano. Quântico. Holístico."*

---
> Manifesto Holistic Mission Control · v2.1 · 2026-03-08
> Próxima revisão recomendada: Sprint 12 ou primeiro fracasso documentado
