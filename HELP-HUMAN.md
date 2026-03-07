# HELP — Mission Control: Guia para Agentes Humanos
> Tutorial completo, narrativo e didático.
> Você não precisa saber programar para operar o sistema.
> Atualizado automaticamente pelo Protocolo Scribe a cada Sprint.
> Última revisão: Sprint 7.3 — 2026-03-07

---

## Índice

1. [O que é o Mission Control?](#1-o-que-é-o-mission-control)
2. [Pré-requisitos e Instalação](#2-pré-requisitos-e-instalação)
3. [Iniciando o Sistema](#3-iniciando-o-sistema)
4. [Conhecendo o Dashboard](#4-conhecendo-o-dashboard)
5. [Sua Colmeia de Agentes](#5-sua-colmeia-de-agentes)
6. [Como Conversar com um Agente](#6-como-conversar-com-um-agente)
7. [O Quadro Kanban](#7-o-quadro-kanban)
8. [O Bulletin Board — Mural da Colmeia](#8-o-bulletin-board--mural-da-colmeia)
9. [Spawning: Criando Sub-Agentes](#9-spawning-criando-sub-agentes)
10. [Cooperando com a Argenta](#10-cooperando-com-a-argenta)
11. [Comandos via Terminal (mc CLI)](#11-comandos-via-terminal-mc-cli)
12. [Perguntas Frequentes](#12-perguntas-frequentes)

---

## 1. O que é o Mission Control?

Imagine um **centro de comando** para uma equipe de assistentes de IA especializados.

Cada assistente (chamado de **agente**) tem:
- Uma **identidade** — nome, personalidade, especialidade
- Um **domínio** — o que ele faz melhor (código, planejamento, debug, etc.)
- Uma **alma** — conjunto de diretrizes que guiam seu comportamento
- **Habilidades** — módulos que expandem suas capacidades

O Mission Control é a interface onde você:
- Vê todos os agentes e seus estados em tempo real
- Conversa diretamente com qualquer agente
- Distribui tarefas e acompanha o progresso
- Cria agentes temporários para missões específicas
- Monitora a comunicação entre agentes

**Em linguagem simples:** é como o painel de controle de uma nave espacial, mas para uma equipe de IAs que trabalham para você.

---

## 2. Pré-requisitos e Instalação

### O que você precisa ter instalado:
- **Node.js** versão 18 ou superior ([nodejs.org](https://nodejs.org))
- **Kilo Code** — extensão do VS Code que fornece o motor de IA
- **Git** (para atualizações)

### Verificando se tudo está ok:
```bash
node --version   # deve mostrar v18 ou superior
```

### Instalando o Mission Control:
```bash
# Clone o repositório
git clone https://github.com/rabelojunior81-collab/argenta-holistic-control
cd argenta-holistic-control

# Instale as dependências (apenas js-yaml)
npm install

# Instale o comando mc globalmente (opcional mas recomendado)
npm link
```

---

## 3. Iniciando o Sistema

O sistema tem duas partes que precisam rodar simultaneamente:

### Parte 1 — Motor de IA (Kilo)
No VS Code, o Kilo Code inicia automaticamente quando você abre o editor.
Você pode verificar se está rodando acessando: `http://localhost:4096/global/health`

Se ver `{"status":"ok"}`, o motor está pronto.

### Parte 2 — Mission Control
```bash
npm run ui
```

Você verá:
```
Mission Control ouvindo na porta 3030
```

Agora abra o navegador em: **http://localhost:3030**

### Iniciando tudo junto:
```bash
npm run serve   # inicia Kilo (se disponível via CLI)
npm run ui      # em outro terminal, inicia o dashboard
```

---

## 4. Conhecendo o Dashboard

Ao abrir o navegador, você verá o painel principal dividido em regiões:

```
┌─────────────────────────────────────────────────────────┐
│  MISSION CONTROL                          [status: ok]   │
├─────────────┬───────────────────────┬───────────────────┤
│             │                       │                   │
│  HIVE PANEL │    KANBAN BOARD       │  BULLETIN BOARD   │
│  (agentes)  │    (tarefas)          │  (comunicados)    │
│             │                       │                   │
│  [Argenta]  │  [ Backlog | Doing |  │  [messages...]    │
│  [Forge]    │    Review | Done ]    │                   │
│  [Oracle]   │                       │                   │
│  [Sleuth]   │                       │                   │
│  [Commander]│                       │                   │
│  [Lore]     │                       │                   │
└─────────────┴───────────────────────┴───────────────────┘
```

### Painel Esquerdo — Hive Panel
Lista todos os agentes ativos. Cada agente mostra:
- Nome e domínio
- Status atual (idle / in_progress / blocked / zombie)
- Botões de ação

### Painel Central — Kanban Board
Quadro de tarefas em 4 colunas: Backlog, Doing, Review, Done.
Você pode arrastar tarefas ou clicar para interagir.

### Painel Direito — Bulletin Board
Mural de comunicações. Agentes e você postam mensagens aqui.
9 tópicos disponíveis: orchestration, debug, brainstorm, alert, report, request, feedback, coordination, general.

---

## 5. Sua Colmeia de Agentes

### Os 5 Agentes Nativos

| Agente | Nome | Especialidade | Quando usar |
|--------|------|---------------|-------------|
| `code` | **The Forge** | Desenvolvimento | Escrever, revisar ou refatorar código |
| `plan` | **The Oracle** | Planejamento | Criar estratégias, roadmaps, arquitetura |
| `debug` | **The Sleuth** | Investigação | Encontrar bugs, analisar erros |
| `orchestrator` | **The Commander** | Coordenação | Delegar tarefas entre agentes |
| `ask` | **The Lore Keeper** | Conhecimento | Responder dúvidas, explicar conceitos |

### Entendendo os Status

| Status | Significado | O que fazer |
|--------|-------------|-------------|
| `idle` | Disponível | Pode enviar mensagens |
| `in_progress` | Trabalhando | Aguarde ou acompanhe |
| `blocked` | Impedido | Verifique o Bulletin Board |
| `zombie` | Sem resposta por 2+ min | Tente reiniciar a sessão |
| `done` | Encerrado | Tarefa concluída |

### Character Chart — A Ficha do Agente
Clique no nome de qualquer agente para ver sua ficha completa (estilo RPG):
- **Atributos:** STR, INT, WIS, DEX, VIT, CHA (escala 0-100)
- **Resistências:** Complexity, Context Loss, Tool Fail, Rate Limit
- **Habilidade especial:** única por agente (ex: FORGE 100 para The Forge)
- **Skills ativas:** módulos de capacidade carregados

---

## 6. Como Conversar com um Agente

### Método 1 — Chat Overlay (recomendado)
1. No Hive Panel, clique no botão **Chat** ao lado do agente
2. Uma janela de chat abre sobre o dashboard
3. Digite sua mensagem e pressione Enter
4. O agente responde em tempo real

### Método 2 — Via Kanban
1. Clique em uma tarefa no Kanban que tenha um agente associado
2. O chat abre automaticamente conectado a esse agente e tarefa

### Dicas para conversar bem com os agentes:
- **Seja específico:** "Analise o arquivo server.mjs e encontre onde o endpoint /api/chat está definido" é melhor que "analise o servidor"
- **Dê contexto:** mencione arquivos, erros, ou o que você já tentou
- **Um agente por vez:** cada agente tem seu domínio — use o certo para cada tarefa
- **Verifique o status:** um agente `zombie` pode não responder — reinicie a sessão

### O que acontece por baixo dos panos:
Quando você envia uma mensagem, o sistema injeta automaticamente a identidade do agente (nome, alma, habilidades) antes de enviar para o motor de IA. O agente "sabe quem é" graças a esse contexto.

---

## 7. O Quadro Kanban

O Kanban organiza tarefas em 4 estágios do fluxo de trabalho:

```
BACKLOG → DOING → REVIEW → DONE
```

### Criando uma tarefa
1. Clique no botão **+** em qualquer coluna
2. Preencha: título, descrição, agente responsável (opcional)
3. Confirme — a tarefa aparece na coluna escolhida

### Movendo uma tarefa
- **Arrastar:** segure e arraste para outra coluna
- **Botões:** use os botões de seta no card da tarefa

### Vinculando uma tarefa a um agente
Se uma tarefa tem um `chatKey` definido (id do agente), clicar nela abre o chat com aquele agente. Isso é criado automaticamente pelo sistema ao usar o dispatch de tarefas.

### Dispatch — Enviando para um agente trabalhar
No modo de dispatch, você descreve uma tarefa e escolhe um agente. O sistema:
1. Cria a tarefa no Kanban (coluna Doing)
2. Envia o prompt para o agente
3. Transmite a resposta em tempo real no chat
4. Ao concluir, move para Review

---

## 8. O Bulletin Board — Mural da Colmeia

O Bulletin Board é onde você e os agentes trocam comunicados formais.

### Por que usar o Bulletin Board e não o Chat?
- **Chat** = conversa direta, síncrona, pessoal
- **Bulletin Board** = comunicados, alertas, coordenação assíncrona, múltiplos leitores

### Postando uma mensagem
1. Clique em **New Message** no Bulletin Board
2. Escolha o tópico (ex: `brainstorm`, `alert`, `request`)
3. Digite sua mensagem
4. Poste — todos os agentes conectados recebem em tempo real

### Respondendo a uma mensagem
Clique em **Reply** em qualquer card para adicionar uma resposta aninhada.

### Tópicos disponíveis
| Tópico | Para que serve |
|--------|----------------|
| `orchestration` | Coordenação de missões complexas |
| `debug` | Relatos de erros e investigações |
| `brainstorm` | Ideias e discussões abertas |
| `alert` | Situações urgentes ou bloqueios |
| `report` | Resultados e conclusões |
| `request` | Pedidos de recurso ou ajuda |
| `feedback` | Avaliações e sugestões |
| `coordination` | Sincronização entre agentes |
| `general` | Tudo que não se encaixa acima |

---

## 9. Spawning: Criando Sub-Agentes

Além dos 5 agentes nativos, você pode criar **zambias** — agentes temporários com missão específica.

### Quando criar um zambia?
- Quando uma tarefa é muito específica para os agentes padrão
- Quando você quer isolar um contexto (ex: "um agente só para revisar este PR")
- Quando precisa de paralelismo (múltiplas tarefas simultâneas)

### Como criar um zambia
1. Clique no botão **Spawn Agent** no Hive Panel
2. Preencha o formulário:
   - **Nome:** nome descritivo (ex: "PR Reviewer")
   - **Missão:** descrição clara do objetivo
   - **Soul:** alma/personalidade (ex: `kilo-native`)
   - **Skills:** habilidades específicas para a missão
   - **Parent:** agente pai (opcional — quem delegou)
   - **Auto-close:** marque para fechar automaticamente após 5 min de idle
3. Confirme — o agente é criado e ativado imediatamente

### Ciclo de vida de um zambia
```
Spawn → Activate → in_progress → idle → [auto-close após 5min idle]
                                       ↓ (ou manualmente)
                                      done
```

---

## 10. Cooperando com a Argenta

A Argenta é a concierge-orquestradora da colmeia. Você pode trabalhar com ela de duas formas:

### Como colaborador humano
Você define a direção, a Argenta executa e coordena:
1. Descreva sua intenção em linguagem natural
2. A Argenta usa o Bulletin Board para coordenar os agentes
3. Acompanhe o progresso no Kanban
4. Revise os resultados antes de aprovar

### Comandos úteis para a Argenta (via chat)
- *"Analise o estado atual da colmeia e me dê um resumo"*
- *"Crie um plano para implementar [feature X]"*
- *"Verifique se há bloqueios ou agentes zombie"*
- *"Post no Bulletin Board um alerta sobre [situação Y]"*

### Boas práticas de cooperação
- Seja claro sobre o **resultado esperado**, não apenas a tarefa
- Permita que a Argenta faça **perguntas de clarificação** antes de agir
- Revise o **Bulletin Board** regularmente para acompanhar a coordenação
- Aprove ações irreversíveis (deletar arquivos, push de código) explicitamente

---

## 11. Comandos via Terminal (mc CLI)

Se preferir operar pelo terminal, o comando `mc` oferece acesso completo ao sistema.

### Instalação
```bash
npm link   # dentro do diretório do projeto
mc --help  # verifica se funcionou
```

### Comandos principais

```bash
# Ver o estado geral da colmeia
mc status

# Listar todos os agentes
mc agent list

# Ver detalhes de um agente específico
mc agent show code

# Conversar com um agente (REPL interativo)
mc chat code

# Listar tarefas do Kanban
mc task list

# Criar uma tarefa
mc task add "Revisar documentação" --column backlog

# Ler o Bulletin Board
mc board read

# Postar no Bulletin Board
mc board post --topic alert "Kilo offline, investigando"

# Ver memória/stats de um agente
mc agent memory orchestrator

# Broadcast para todos os agentes
mc hive broadcast "Reunião de sincronização em 5 minutos"
```

### Atalhos úteis
```bash
mc status --full          # status completo com todos os detalhes
mc agent list --zombies   # mostrar apenas agentes zombie
mc board read --n 20      # últimas 20 mensagens do board
mc task list --column doing  # apenas tarefas em progresso
```

---

## 12. Perguntas Frequentes

**O sistema não abre no navegador. O que fazer?**
Verifique se o servidor está rodando com `npm run ui`. Se a porta 3030 estiver ocupada, encontre e encerre o processo:
```bash
netstat -ano | grep ":3030 "
# anote o PID e encerre:
taskkill /PID <numero> /F
```

**O agente não responde. O que aconteceu?**
1. Verifique o status no Hive Panel — se for `zombie`, o agente perdeu o heartbeat
2. Verifique se o Kilo está rodando em `localhost:4096`
3. Tente abrir um novo chat com o agente

**Como sei se o Kilo está funcionando?**
Acesse `http://localhost:4096/global/health`. Se retornar `{"status":"ok"}`, está ok. O dashboard também mostra o status do Kilo no header.

**Posso usar qualquer modelo de IA?**
Sim, desde que esteja autenticado no Kilo. Os providers disponíveis aparecem no modal de configuração. Providers atualmente autenticados são listados em `GET /api/providers`.

**O que é um "zambia"?**
É um agente temporário criado para uma missão específica. Diferente dos agentes nativos (permanentes), zambias podem ser configurados para encerrar automaticamente após concluir.

**Como atualizo o sistema?**
```bash
git pull origin master
npm install   # se houver novas dependências
# reinicie o servidor
```

**Onde ficam salvas as conversas?**
Em `ops/chat-sessions.json` (restauradas automaticamente ao reiniciar). Mensagens do Bulletin Board ficam em `bus/messages.jsonl`. Memórias de agentes ficam em `hive/memory/`.

**Posso perguntar à Argenta diretamente no dashboard?**
Sim! Abra o chat com o agente `orchestrator` (The Commander) ou `ask` (The Lore Keeper) e pergunte qualquer coisa sobre o sistema. Eles conhecem o contexto completo da colmeia.

---

*HELP-HUMAN.md — Atualizado pelo Protocolo Scribe a cada Sprint*
*Dúvidas? Abra um chat com The Lore Keeper (agente `ask`) ou poste no Bulletin Board (topic: general)*
