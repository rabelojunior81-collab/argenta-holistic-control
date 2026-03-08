/**
 * MCP Manager — Gerenciador de Servidores MCP
 * 
 * Comandos:
 *   node mcp-manager.mjs list              → Lista servidores MCP
 *   node mcp-manager.mjs status            → Status da integração MCP
 *   node mcp-manager.mjs add <name>        → Adiciona servidor MCP
 *   node mcp-manager.mjs remove <name>     → Remove servidor MCP
 *   node mcp-manager.mjs enable <name>     → Habilita servidor MCP
 *   node mcp-manager.mjs disable <name>    → Desabilita servidor MCP
 *   node mcp-manager.mjs tools [server]    → Lista ferramentas disponíveis
 *   node mcp-manager.mjs invoke <server> <tool> [args] → Invoca ferramenta MCP
 */

import {
  listMcpServers,
  getMcpStatus,
  addMcpServer,
  removeMcpServer,
  toggleMcpServer,
  listMcpTools,
  invokeMcpTool,
} from "./adapter.mjs";

const CMD = process.argv[2];
const ARG1 = process.argv[3];
const ARG2 = process.argv[4];
const ARG3 = process.argv[5];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printTable(rows, headers) {
  if (rows.length === 0) {
    console.log("  (nenhum resultado)");
    return;
  }
  
  // Calcula larguras
  const widths = headers.map((h, i) => {
    const maxData = Math.max(...rows.map(r => String(r[i] || "").length));
    return Math.max(h.length, maxData);
  });
  
  // Header
  console.log("  " + headers.map((h, i) => h.padEnd(widths[i])).join("  "));
  console.log("  " + widths.map(w => "-".repeat(w)).join("  "));
  
  // Rows
  rows.forEach(row => {
    console.log("  " + row.map((cell, i) => String(cell || "").padEnd(widths[i])).join("  "));
  });
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

// ─── Comandos ────────────────────────────────────────────────────────────────

async function cmdList() {
  const servers = await listMcpServers();
  console.log(`\n📦 Servidores MCP Configurados (${servers.length}):\n`);
  
  const rows = servers.map(s => [
    s.name,
    s.type,
    s.enabled ? "✅" : "❌",
    s.description || "-",
  ]);
  
  printTable(rows, ["Nome", "Tipo", "Ativo", "Descrição"]);
  console.log();
}

async function cmdStatus() {
  const status = await getMcpStatus();
  console.log("\n🔌 Status da Integração MCP\n");
  console.log(`  Config:     ${status.configPath}`);
  console.log(`  Servidores: ${status.servers.enabled}/${status.servers.total} ativos`);
  console.log(`  Kilo Serve: ${status.kiloServe.healthy ? "✅ Online" : "❌ Offline"} (${status.kiloServe.baseUrl})`);
  console.log();
}

async function cmdAdd() {
  if (!ARG1) {
    console.error("\n❌ Uso: mcp-manager.mjs add <nome> [--type local|remote] [--cmd <comando>]\n");
    process.exit(1);
  }
  
  const name = ARG1;
  const type = process.argv.includes("--type") 
    ? process.argv[process.argv.indexOf("--type") + 1] 
    : "local";
  
  let serverConfig = { type, enabled: true };
  
  if (type === "local") {
    const cmdIndex = process.argv.indexOf("--cmd");
    if (cmdIndex !== -1 && process.argv[cmdIndex + 1]) {
      serverConfig.command = process.argv[cmdIndex + 1].split(" ");
    } else {
      // Configurações pré-definidas
      const PRESETS = {
        filesystem: { command: ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."] },
        git: { command: ["npx", "-y", "@modelcontextprotocol/server-git"] },
        fetch: { command: ["npx", "-y", "@modelcontextprotocol/server-fetch"] },
        "sequential-thinking": { command: ["npx", "-y", "@modelcontextprotocol/server-sequentialthinking"] },
        memory: { command: ["npx", "-y", "@modelcontextprotocol/server-memory"] },
        everything: { command: ["npx", "-y", "@modelcontextprotocol/server-everything"] },
      };
      
      if (PRESETS[name]) {
        Object.assign(serverConfig, PRESETS[name]);
        console.log(`\n📦 Usando preset para '${name}'`);
      } else {
        console.error(`\n❌ Especifique --cmd para servidor local ou use um nome conhecido: ${Object.keys(PRESETS).join(", ")}\n`);
        process.exit(1);
      }
    }
  } else if (type === "remote") {
    const urlIndex = process.argv.indexOf("--url");
    if (urlIndex === -1 || !process.argv[urlIndex + 1]) {
      console.error("\n❌ Servidor remoto requer --url <endpoint>\n");
      process.exit(1);
    }
    serverConfig.url = process.argv[urlIndex + 1];
  }
  
  const result = await addMcpServer(name, serverConfig);
  if (result.success) {
    console.log(`\n✅ Servidor MCP '${name}' adicionado com sucesso!`);
    console.log(`   Tipo: ${type}`);
    if (serverConfig.command) console.log(`   Comando: ${serverConfig.command.join(" ")}`);
    if (serverConfig.url) console.log(`   URL: ${serverConfig.url}`);
    console.log();
  } else {
    console.error(`\n❌ Erro: ${result.error}\n`);
    process.exit(1);
  }
}

async function cmdRemove() {
  if (!ARG1) {
    console.error("\n❌ Uso: mcp-manager.mjs remove <nome>\n");
    process.exit(1);
  }
  
  const result = await removeMcpServer(ARG1);
  if (result.success) {
    console.log(`\n✅ Servidor MCP '${ARG1}' removido.\n`);
  } else {
    console.error(`\n❌ ${result.error}\n`);
    process.exit(1);
  }
}

async function cmdEnable() {
  if (!ARG1) {
    console.error("\n❌ Uso: mcp-manager.mjs enable <nome>\n");
    process.exit(1);
  }
  
  const result = await toggleMcpServer(ARG1, true);
  if (result.success) {
    console.log(`\n✅ Servidor MCP '${ARG1}' habilitado.\n`);
  } else {
    console.error(`\n❌ ${result.error}\n`);
    process.exit(1);
  }
}

async function cmdDisable() {
  if (!ARG1) {
    console.error("\n❌ Uso: mcp-manager.mjs disable <nome>\n");
    process.exit(1);
  }
  
  const result = await toggleMcpServer(ARG1, false);
  if (result.success) {
    console.log(`\n✅ Servidor MCP '${ARG1}' desabilitado.\n`);
  } else {
    console.error(`\n❌ ${result.error}\n`);
    process.exit(1);
  }
}

async function cmdTools() {
  const serverName = ARG1;
  const tools = await listMcpTools(serverName);
  
  if (serverName) {
    console.log(`\n🔧 Ferramentas do servidor '${serverName}' (${tools.length}):\n`);
  } else {
    console.log(`\n🔧 Todas as ferramentas MCP (${tools.length}):\n`);
  }
  
  if (tools.length === 0) {
    console.log("  (nenhuma ferramenta encontrada)");
  } else {
    tools.forEach(tool => {
      console.log(`  • ${tool.name}`);
      console.log(`    ${tool.description || "Sem descrição"}`);
      if (tool.parameters) {
        console.log(`    Parâmetros: ${JSON.stringify(tool.parameters)}`);
      }
      console.log();
    });
  }
}

async function cmdInvoke() {
  if (!ARG1 || !ARG2) {
    console.error("\n❌ Uso: mcp-manager.mjs invoke <servidor> <ferramenta> [args-json]\n");
    console.error("   Ex: mcp-manager.mjs invoke filesystem read_file '{\"path\": \"./README.md\"}'\n");
    process.exit(1);
  }
  
  const serverName = ARG1;
  const toolName = ARG2;
  let args = {};
  
  if (ARG3) {
    try {
      args = JSON.parse(ARG3);
    } catch {
      console.error("\n❌ Argumentos devem ser JSON válido\n");
      process.exit(1);
    }
  }
  
  console.log(`\n🔧 Invocando ${serverName}.${toolName}...`);
  console.log(`   Args: ${JSON.stringify(args)}\n`);
  
  try {
    const result = await invokeMcpTool(serverName, toolName, args);
    console.log("📤 Resultado:\n");
    printJson(result);
    console.log();
  } catch (err) {
    console.error(`\n❌ Erro: ${err.message}\n`);
    process.exit(1);
  }
}

async function cmdHelp() {
  console.log(`
📘 MCP Manager — Gerenciador de Servidores MCP

Uso: node mcp-manager.mjs <comando> [args]

Comandos:
  list                          Lista servidores MCP configurados
  status                        Mostra status da integração MCP
  add <nome> [--type <tipo>] [--cmd <cmd>] [--url <url>]
                                Adiciona servidor MCP
  remove <nome>                 Remove servidor MCP
  enable <nome>                 Habilita servidor MCP
  disable <nome>                Desabilita servidor MCP
  tools [servidor]              Lista ferramentas disponíveis
  invoke <srv> <tool> [args]    Invoca ferramenta MCP
  help                          Mostra esta ajuda

Exemplos:
  node mcp-manager.mjs add filesystem
  node mcp-manager.mjs add my-api --type remote --url http://localhost:3000/mcp
  node mcp-manager.mjs enable filesystem
  node mcp-manager.mjs tools filesystem
  node mcp-manager.mjs invoke filesystem read_file '{"path":"./package.json"}'

Presets disponíveis para 'add':
  filesystem, git, fetch, sequential-thinking, memory, everything
`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const COMMANDS = {
  list: cmdList,
  status: cmdStatus,
  add: cmdAdd,
  remove: cmdRemove,
  enable: cmdEnable,
  disable: cmdDisable,
  tools: cmdTools,
  invoke: cmdInvoke,
  help: cmdHelp,
};

const cmd = COMMANDS[CMD] || cmdHelp;
await cmd();
