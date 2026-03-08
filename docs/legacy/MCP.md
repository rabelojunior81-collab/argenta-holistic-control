# MCP (Model Context Protocol) — Integração HMC

Este documento descreve a integração do Mission Control com MCP (Model Context Protocol), permitindo que agentes Kilo acessem ferramentas externas como filesystem, git, APIs e mais.

---

## 📋 Visão Geral

**MCP** é o "USB-C para IA" — um protocolo aberto que conecta agentes de IA a sistemas externos via ferramentas padronizadas.

### Arquitetura

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Kilo Code     │◄────►│  MCP Servers    │◄────►│  External APIs  │
│   (Agente)      │      │  (filesystem,   │      │  (Git, DB,      │
│                 │      │   git, fetch)   │      │   Cloud...)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Kilo Serve     │  ← :4096
│  (HTTP API)     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  HMC Adapter    │  ← kilo-adapter/adapter.mjs
│  (MCP Client)   │
└─────────────────┘
```

---

## 🚀 Início Rápido

### 1. Verificar Status MCP

```bash
npm run mcp:status
```

### 2. Listar Servidores Configurados

```bash
npm run mcp:list
```

Saída esperada:
```
📦 Servidores MCP Configurados (5):

  Nome                Tipo    Ativo  Descrição
  ------------------  ------  -----  --------------------------------
  filesystem          local   ✅     Acesso seguro ao sistema de arquivos
  git                 local   ✅     Operações Git
  fetch               local   ✅     Fetch de conteúdo web
  sequential-thinking local   ✅     Pensamento sequencial
  memory              local   ❌     Sistema de memória
```

### 3. Usar via Código

```javascript
import {
  listMcpServers,
  listMcpTools,
  invokeMcpTool,
  addMcpServer,
} from "./kilo-adapter/adapter.mjs";

// Listar servidores
const servers = await listMcpServers();
console.log(servers);

// Listar ferramentas de um servidor
const tools = await listMcpTools("filesystem");
console.log(tools);

// Invocar ferramenta
const result = await invokeMcpTool("filesystem", "read_file", {
  path: "./package.json"
});
console.log(result);
```

---

## 🛠️ Gerenciamento de Servidores MCP

### Adicionar Servidor

**Usando preset (recomendado):**
```bash
npm run mcp -- add filesystem
npm run mcp -- add git
npm run mcp -- add fetch
npm run mcp -- add sequential-thinking
npm run mcp -- add memory
npm run mcp -- add everything
```

**Servidor local customizado:**
```bash
npm run mcp -- add my-server --type local --cmd "npx -y @me/my-mcp-server"
```

**Servidor remoto:**
```bash
npm run mcp -- add my-api --type remote --url https://api.example.com/mcp
```

### Remover Servidor

```bash
npm run mcp -- remove filesystem
```

### Habilitar/Desabilitar

```bash
npm run mcp -- enable filesystem
npm run mcp -- disable filesystem
```

### Listar Ferramentas

```bash
# Todas as ferramentas
npm run mcp:tools

# Ferramentas de um servidor específico
npm run mcp -- tools filesystem
```

### Invocar Ferramenta

```bash
npm run mcp -- invoke filesystem read_file '{"path": "./README.md"}'
```

---

## 📦 Servidores MCP Pré-configurados

### 1. Filesystem
**Ferramentas:** `read_file`, `write_file`, `list_directory`, `search_files`

```javascript
// Exemplo: Ler arquivo
await invokeMcpTool("filesystem", "read_file", { path: "./src/index.js" });

// Exemplo: Listar diretório
await invokeMcpTool("filesystem", "list_directory", { path: "./src" });
```

### 2. Git
**Ferramentas:** `git_log`, `git_diff`, `git_status`

```javascript
// Histórico de commits
await invokeMcpTool("git", "git_log", { repo_path: ".", max_count: 10 });

// Status do repo
await invokeMcpTool("git", "git_status", { repo_path: "." });
```

### 3. Fetch
**Ferramentas:** `fetch`

```javascript
// Buscar conteúdo web
await invokeMcpTool("fetch", "fetch", { 
  url: "https://api.github.com/repos/Kilo-Org/kilocode" 
});
```

### 4. Sequential Thinking
**Ferramentas:** `think`

Para resolução de problemas complexos via pensamento sequencial.

```javascript
await invokeMcpTool("sequential-thinking", "think", {
  thought: "Primeiro passo: analisar o problema...",
  thoughtNumber: 1,
  totalThoughts: 5
});
```

### 5. Memory (desabilitado por padrão)
**Ferramentas:** Sistema de memória com knowledge graph

```bash
npm run mcp -- enable memory
```

---

## 🔧 Configuração Avançada

### Arquivo kilo.json

A configuração MCP fica em `kilo.json` na raiz do projeto:

```json
{
  "mcp": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."],
      "enabled": true,
      "description": "Acesso ao sistema de arquivos"
    },
    "minha-api": {
      "type": "remote",
      "url": "https://api.minhaempresa.com/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer {env:API_TOKEN}"
      }
    }
  }
}
```

### Variáveis de Ambiente

Use `{env:NOME_VAR}` para referenciar variáveis de ambiente:

```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": {
        "GITHUB_TOKEN": "{env:GITHUB_TOKEN}"
      }
    }
  }
}
```

---

## 🔌 Integração com Kilo CLI

Para usar MCP no Kilo CLI nativamente:

```bash
# Instalar Kilo CLI globalmente (se ainda não tiver)
npm install -g @kilocode/cli

# Verificar versão
kilo --version

# Comandos MCP do Kilo CLI
kilo mcp list
kilo mcp add
kilo mcp auth
```

A configuração `kilo.json` é compatível com o Kilo CLI — ambos usam o mesmo formato.

---

## 🧪 Testando MCP

### Teste Rápido

```bash
# 1. Verifique se Kilo Serve está rodando
npm run serve

# 2. Em outro terminal, teste MCP
npm run mcp:status
npm run mcp:list
npm run mcp -- tools filesystem
```

### Teste de Invocação

```bash
npm run mcp -- invoke filesystem read_file '{"path": "./package.json"}'
```

---

## 📚 Referência da API MCP

### Funções Exportadas (adapter.mjs)

| Função | Descrição | Exemplo |
|--------|-----------|---------|
| `listMcpServers()` | Lista todos os servidores | `await listMcpServers()` |
| `getMcpServer(name)` | Obtém config de um servidor | `await getMcpServer("git")` |
| `addMcpServer(name, config)` | Adiciona/atualiza servidor | `await addMcpServer("my", {...})` |
| `removeMcpServer(name)` | Remove servidor | `await removeMcpServer("my")` |
| `toggleMcpServer(name, enabled)` | Habilita/desabilita | `await toggleMcpServer("my", true)` |
| `listMcpTools(serverName?)` | Lista ferramentas | `await listMcpTools("git")` |
| `invokeMcpTool(server, tool, args)` | Invoca ferramenta | `await invokeMcpTool("git", "log", {})` |
| `getMcpStatus()` | Status completo | `await getMcpStatus()` |

---

## 🔗 Recursos Adicionais

- [Documentação Oficial MCP](https://kilo.ai/docs/automate/mcp/overview)
- [Repositório MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Especificação MCP](https://github.com/modelcontextprotocol/)
- [Kilo Marketplace](https://github.com/Kilo-Org/kilo-marketplace)

---

## ❓ Troubleshooting

### "Kilo Serve MCP endpoint não disponível"

Isso é normal se o Kilo Serve não expõe endpoint MCP diretamente. As tools MCP funcionam via Kilo CLI quando você usa `kilo` no terminal.

### Servidor não aparece na lista

Verifique se o arquivo `kilo.json` existe e está válido:
```bash
cat kilo.json | jq .
```

### Ferramenta retorna erro

1. Verifique se o servidor está habilitado: `npm run mcp:list`
2. Verifique os argumentos da ferramenta
3. Consulte a documentação do servidor MCP específico

---

## 🎯 Próximos Passos

- [ ] Criar MCP Server custom para Mission Control
- [ ] Integrar com Qdrant para memória semântica
- [ ] Publicar no Kilo Marketplace
- [ ] Criar UI para gerenciamento visual de MCP

---

*Última atualização: 2025-03-07*
